import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyLedgerService, type LoyaltyTx } from './loyalty-ledger.service';

@Injectable()
export class LoyaltyOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LoyaltyLedgerService,
  ) {}

  /** Called inside the order/payment transaction; unique source keys make event replay safe. */
  async syncOrder(tx: LoyaltyTx, orderId: bigint, now = new Date()) {
    const order = await tx.orders.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) return null;
    const member = await tx.loyalty_members.findUnique({
      where: { user_id: order.buyer_id },
    });
    if (!member || order.created_at < member.joined_at) return null;
    const { version, policy } = await this.ledger.rule(tx, now);
    const locked = await this.ledger.lock(tx, order.buyer_id, policy, now);
    const earned = await tx.loyalty_point_transactions.findUnique({
      where: { source_key: `earn:${orderId}` },
    });
    if (['RETURNED', 'CANCELLED'].includes(order.status) && earned) {
      const expired = await tx.loyalty_point_transactions.findUnique({
        where: { source_key: `reverse:${orderId}` },
      });
      if (expired) return expired;
      // Points which already expired must not be charged a second time on a later return.
      const expiredLot = await tx.loyalty_point_lots.findUnique({
        where: { transaction_id: earned.id },
      });
      const expiry = expiredLot
        ? await tx.loyalty_point_transactions.findUnique({
            where: { source_key: `expire:${expiredLot.id}` },
          })
        : null;
      const entry = await this.ledger.post(
        tx,
        {
          memberId: order.buyer_id,
          kind: 'REVERSAL',
          points: -(earned.points + (expiry?.points ?? 0)),
          sourceKey: `reverse:${orderId}`,
          orderId,
          ruleId: earned.rule_version_id ?? undefined,
          description: `Thu hồi điểm đơn ${order.order_code}`,
          allowDebt: true,
          now,
          qualifyingAmount:
            earned.created_at >= locked.cycle_started_at
              ? earned.qualifying_amount.negated()
              : new Prisma.Decimal(0),
        },
        policy,
      );
      await this.ledger.audit(
        tx,
        null,
        'ORDER_POINTS_REVERSED',
        'TRANSACTION',
        entry.id,
        null,
        { orderId, points: entry.points },
      );
      return entry;
    }
    if (
      earned ||
      order.status !== 'COMPLETED' ||
      order.payment_status !== 'PAID'
    )
      return earned;
    const paid = order.payments
      .filter(
        (p) => p.status === 'PAID' && p.paid_at != null && p.paid_at <= now,
      )
      .reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
    if (paid.lt(order.total_amount)) return null;
    const amount = Prisma.Decimal.max(
      order.subtotal.sub(order.discount_amount),
      0,
    );
    const points = policy.pointsFor(amount, locked.qualifying_spend);
    const entry = await this.ledger.post(
      tx,
      {
        memberId: order.buyer_id,
        kind: 'EARN',
        points,
        sourceKey: `earn:${orderId}`,
        description: `Tích điểm đơn ${order.order_code}`,
        orderId,
        ruleId: version.id,
        qualifyingAmount: amount,
        expiresAt: policy.expiresAt(now),
        now,
      },
      policy,
    );
    await this.ledger.audit(
      tx,
      null,
      'ORDER_POINTS_EARNED',
      'TRANSACTION',
      entry.id,
      null,
      { orderId, points, ruleVersion: version.id, amount },
    );
    return entry;
  }

  async reconcile(limit = 100) {
    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT TOP (${limit}) o.id FROM orders o JOIN loyalty_members m ON m.user_id = o.buyer_id
      WHERE o.created_at >= m.joined_at AND (
        (o.status = 'COMPLETED' AND o.payment_status = 'PAID' AND NOT EXISTS
          (SELECT 1 FROM loyalty_point_transactions e WHERE e.source_key = CONCAT('earn:', o.id)))
        OR (o.status IN ('RETURNED','CANCELLED') AND EXISTS
          (SELECT 1 FROM loyalty_point_transactions e WHERE e.source_key = CONCAT('earn:', o.id))
          AND NOT EXISTS (SELECT 1 FROM loyalty_point_transactions r WHERE r.source_key = CONCAT('reverse:', o.id)))
      ) ORDER BY o.id`;
    let processed = 0;
    for (const row of rows) {
      // Same lock order as order mutations: order, then member.
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM orders WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${row.id}`;
          if (await this.syncOrder(tx, row.id)) processed++;
        },
        { timeout: 15000 },
      );
    }
    return { inspected: rows.length, processed };
  }
}
