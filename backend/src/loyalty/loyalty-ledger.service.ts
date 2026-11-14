import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { EarningPolicy } from './earning-policy';

export type LoyaltyTx = Prisma.TransactionClient;

export function loyaltyJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, entry: unknown) =>
      typeof entry === 'bigint' ? entry.toString() : entry,
    ),
  ) as Prisma.InputJsonValue;
}

/** All balance/lot mutations happen while holding the member row lock. */
@Injectable()
export class LoyaltyLedgerService {
  async rule(tx: LoyaltyTx, at = new Date()) {
    const version = await tx.loyalty_rule_versions.findFirst({
      where: { status: 'PUBLISHED', effective_at: { lte: at } },
      orderBy: [{ effective_at: 'desc' }, { id: 'desc' }],
    });
    if (!version)
      throw new ServiceUnavailableException(
        'Chưa có chính sách Loyalty đang có hiệu lực',
      );
    return { version, policy: new EarningPolicy(version.config) };
  }

  async audit(
    tx: LoyaltyTx,
    actor: string | null,
    action: string,
    entity: string,
    id: bigint | null,
    before: unknown,
    after: unknown,
  ) {
    await tx.audit_logs.create({
      data: {
        user_id: actor,
        action,
        entity_type: `LOYALTY_${entity}`,
        entity_id: id,
        old_data: before == null ? null : JSON.stringify(loyaltyJson(before)),
        new_data: after == null ? null : JSON.stringify(loyaltyJson(after)),
      },
    });
  }

  async lock(
    tx: LoyaltyTx,
    memberId: string,
    policy: EarningPolicy,
    now = new Date(),
  ) {
    const found = await tx.loyalty_members.findUnique({
      where: { user_id: memberId },
    });
    if (!found)
      throw new NotFoundException('Khách hàng chưa tham gia chương trình');
    let member = await tx.loyalty_members.update({
      where: { user_id: memberId },
      data: { balance: { increment: 0 } },
    });
    const period = policy.config.tierPeriodDays * 86400000;
    if (now.getTime() >= member.cycle_started_at.getTime() + period) {
      const periods = Math.floor(
        (now.getTime() - member.cycle_started_at.getTime()) / period,
      );
      const start = new Date(
        member.cycle_started_at.getTime() + periods * period,
      );
      const aggregate = await tx.loyalty_point_transactions.aggregate({
        where: { member_id: memberId, created_at: { gte: start } },
        _sum: { qualifying_amount: true },
      });
      member = await tx.loyalty_members.update({
        where: { user_id: memberId },
        data: {
          cycle_started_at: start,
          qualifying_spend: Prisma.Decimal.max(
            aggregate._sum.qualifying_amount ?? 0,
            0,
          ),
        },
      });
    }
    const tier = policy.tierFor(member.qualifying_spend);
    if (tier.code !== member.tier_code) {
      await this.audit(
        tx,
        null,
        'TIER_CHANGED',
        'MEMBER',
        null,
        { memberId, tier: member.tier_code },
        { memberId, tier: tier.code, cycleStartedAt: member.cycle_started_at },
      );
      member = await tx.loyalty_members.update({
        where: { user_id: memberId },
        data: { tier_code: tier.code },
      });
    }
    await this.expire(tx, memberId, now);
    return tx.loyalty_members.findUniqueOrThrow({
      where: { user_id: memberId },
    });
  }

  private async expire(tx: LoyaltyTx, memberId: string, now: Date) {
    const lots = await tx.loyalty_point_lots.findMany({
      where: {
        member_id: memberId,
        remaining: { gt: 0 },
        expires_at: { lte: now },
      },
      orderBy: { id: 'asc' },
    });
    for (const lot of lots) {
      await tx.loyalty_point_lots.update({
        where: { id: lot.id },
        data: { remaining: 0 },
      });
      await tx.loyalty_point_transactions.create({
        data: {
          member_id: memberId,
          kind: 'EXPIRE',
          points: -lot.remaining,
          source_key: `expire:${lot.id}`,
          description: 'Điểm hết hạn',
          created_at: now,
        },
      });
      await tx.loyalty_members.update({
        where: { user_id: memberId },
        data: { balance: { decrement: lot.remaining } },
      });
      await this.audit(
        tx,
        null,
        'POINTS_EXPIRED',
        'POINT_LOT',
        lot.id,
        { remaining: lot.remaining },
        { remaining: 0 },
      );
    }
  }

  async post(
    tx: LoyaltyTx,
    input: {
      memberId: string;
      kind: string;
      points: number;
      sourceKey: string;
      description: string;
      ruleId?: bigint;
      orderId?: bigint;
      qualifyingAmount?: Prisma.Decimal;
      expiresAt?: Date;
      allowDebt?: boolean;
      now?: Date;
    },
    policy: EarningPolicy,
  ) {
    const now = input.now ?? new Date();
    const previous = await tx.loyalty_point_transactions.findUnique({
      where: { source_key: input.sourceKey },
    });
    if (previous) return previous;
    const member = await tx.loyalty_members.findUniqueOrThrow({
      where: { user_id: input.memberId },
    });
    const balance = member.balance + input.points;
    if (
      !Number.isSafeInteger(input.points) ||
      balance > 2147483647 ||
      balance < -2147483648
    ) {
      throw new BadRequestException('Số điểm vượt giới hạn');
    }
    if (balance < 0 && input.points < 0 && !input.allowDebt)
      throw new BadRequestException('Không đủ điểm khả dụng');
    if (input.points < 0) {
      let remaining = -input.points;
      const lots = await tx.loyalty_point_lots.findMany({
        where: {
          member_id: input.memberId,
          remaining: { gt: 0 },
          expires_at: { gt: now },
        },
        orderBy: [{ expires_at: 'asc' }, { id: 'asc' }],
      });
      for (const lot of lots) {
        const used = Math.min(lot.remaining, remaining);
        if (used === 0) break;
        await tx.loyalty_point_lots.update({
          where: { id: lot.id },
          data: { remaining: { decrement: used } },
        });
        remaining -= used;
      }
      if (remaining && !input.allowDebt)
        throw new BadRequestException('Sổ điểm không đủ điểm để sử dụng');
    }
    const entry = await tx.loyalty_point_transactions.create({
      data: {
        member_id: input.memberId,
        kind: input.kind,
        points: input.points,
        source_key: input.sourceKey,
        description: input.description,
        order_id: input.orderId,
        rule_version_id: input.ruleId,
        qualifying_amount: input.qualifyingAmount ?? 0,
        created_at: now,
      },
    });
    const availableCredit =
      input.points > 0
        ? Math.max(0, input.points + Math.min(member.balance, 0))
        : 0;
    if (availableCredit > 0) {
      await tx.loyalty_point_lots.create({
        data: {
          transaction_id: entry.id,
          member_id: input.memberId,
          remaining: availableCredit,
          expires_at: input.expiresAt ?? policy.expiresAt(now),
        },
      });
    }
    const spend = Prisma.Decimal.max(
      member.qualifying_spend.add(input.qualifyingAmount ?? 0),
      0,
    );
    const tier = policy.tierFor(spend);
    await tx.loyalty_members.update({
      where: { user_id: input.memberId },
      data: {
        balance,
        qualifying_spend: spend,
        tier_code: tier.code,
      },
    });
    if (tier.code !== member.tier_code)
      await this.audit(
        tx,
        null,
        'TIER_CHANGED',
        'MEMBER',
        null,
        { memberId: input.memberId, tier: member.tier_code },
        { memberId: input.memberId, tier: tier.code },
      );
    return entry;
  }
}
