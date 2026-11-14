import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BuyerFeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  async refresh(buyerId: string) {
    const now = new Date();
    const orders = await this.prisma.orders.findMany({
      where: { buyer_id: buyerId, created_at: { lt: now } },
      orderBy: { created_at: 'asc' },
      include: {
        order_status_history: {
          where: { created_at: { lt: now } },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          take: 1,
        },
        payments: { select: { paid_at: true } },
      },
    });
    const total = orders.length;
    const counts: Record<string, number> = {};
    for (const order of orders) {
      const status = order.order_status_history[0]?.new_status ?? 'PENDING';
      counts[status] = (counts[status] ?? 0) + 1;
    }
    const totalSpent = orders.reduce((sum, order) => {
      const status = order.order_status_history[0]?.new_status ?? 'PENDING';
      return (
        sum +
        (['COMPLETED', 'DELIVERED'].includes(status) &&
        order.payments.some((p) => p.paid_at && p.paid_at < now)
          ? Number(order.total_amount)
          : 0)
      );
    }, 0);
    const interval =
      total > 1
        ? (orders[total - 1].created_at.getTime() -
            orders[0].created_at.getTime()) /
          86400000 /
          (total - 1)
        : 0;
    const features = {
      cancel_rate: (counts.CANCELLED ?? 0) / Math.max(total, 1),
      return_rate: (counts.RETURNED ?? 0) / Math.max(total, 1),
      failure_rate: (counts.FAILED ?? 0) / Math.max(total, 1),
      non_receive_rate: (counts.NON_RECEIVED ?? 0) / Math.max(total, 1),
      total_order_value: Math.round(totalSpent * 100) / 100,
      average_order_value:
        Math.round(
          (orders.reduce((sum, order) => sum + Number(order.total_amount), 0) /
            Math.max(total, 1)) *
            100,
        ) / 100,
      orders_last_7_days: orders.filter(
        (order) => now.getTime() - order.created_at.getTime() <= 7 * 86400000,
      ).length,
      orders_last_30_days: orders.filter(
        (order) => now.getTime() - order.created_at.getTime() <= 30 * 86400000,
      ).length,
      avg_order_interval: Math.round(interval * 100) / 100,
    };
    const profile = {
      total_orders: total,
      completed_orders: counts.COMPLETED ?? 0,
      cancelled_orders: counts.CANCELLED ?? 0,
      returned_orders: counts.RETURNED ?? 0,
      failed_orders: counts.FAILED ?? 0,
      non_received_orders: counts.NON_RECEIVED ?? 0,
      total_spent: totalSpent,
      average_order_value: features.average_order_value,
      first_order_at: orders[0]?.created_at ?? null,
      last_order_at: orders.at(-1)?.created_at ?? null,
      updated_at: now,
    };
    // Daily historical snapshots are sealed. Live scoring uses these returned
    // values, rather than overwriting an earlier point-in-time observation.
    const featureDate = new Date(
      new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10),
    );
    await this.prisma.buyer_profiles.upsert({
      where: { buyer_id: buyerId },
      create: { buyer_id: buyerId, ...profile },
      update: profile,
    });
    // Today's row is a live snapshot; training reconstructs end-of-day features
    // from events and excludes incomplete outcome windows.
    await this.prisma.buyer_features.upsert({
      where: {
        buyer_id_feature_date: { buyer_id: buyerId, feature_date: featureDate },
      },
      create: { buyer_id: buyerId, feature_date: featureDate, ...features },
      update: features,
    });
    const knownOutcomes = [
      'COMPLETED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
      'FAILED',
      'NON_RECEIVED',
    ].reduce((sum, status) => sum + (counts[status] ?? 0), 0);
    return total >= 3 && knownOutcomes > 0 ? features : null;
  }
}
