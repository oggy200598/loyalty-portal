import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../database/prisma.service';

function chartWindow() {
  const offset = 7 * 3600000;
  const today = new Date(Date.now() + offset);
  today.setUTCHours(0, 0, 0, 0);
  const first = new Date(today.getTime() - 29 * 86400000);
  return {
    start: new Date(first.getTime() - offset),
    end: new Date(today.getTime() + 86400000 - offset),
    dates: Array.from({ length: 30 }, (_, index) =>
      new Date(first.getTime() + index * 86400000).toISOString().slice(0, 10),
    ),
  };
}

function monthDates(months: string[], lastDay: string) {
  if (!months.length) return [];
  const first = [...months].sort()[0];
  const cursor = new Date(`${first}-01T00:00:00Z`);
  const last = lastDay.slice(0, 7);
  const dates: string[] = [];
  while (cursor.toISOString().slice(0, 7) <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dates;
}

export async function orderCharts(prisma: PrismaService, shopIds?: bigint[]) {
  const window = chartWindow();
  const scope =
    shopIds === undefined
      ? Prisma.empty
      : shopIds.length
        ? Prisma.sql`AND shop_id IN (${Prisma.join(shopIds)})`
        : Prisma.sql`AND 1 = 0`;
  const [rows, statuses, monthlyRows] = await Promise.all([
    prisma.$queryRaw<
      { day: string; orders: number; revenue: unknown }[]
    >(Prisma.sql`
      SELECT CONVERT(varchar(10), DATEADD(hour, 7, created_at), 23) AS day,
        COUNT(*) AS orders,
        SUM(CASE WHEN status IN (N'DELIVERED', N'COMPLETED') THEN total_amount ELSE 0 END) AS revenue
      FROM dbo.orders WHERE created_at >= ${window.start} AND created_at < ${window.end} ${scope}
      GROUP BY CONVERT(varchar(10), DATEADD(hour, 7, created_at), 23)
    `),
    prisma.orders.groupBy({
      by: ['status'],
      where: shopIds === undefined ? {} : { shop_id: { in: shopIds } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<
      { month: string; orders: number; revenue: unknown }[]
    >(Prisma.sql`
      SELECT CONVERT(varchar(7), DATEADD(hour, 7, created_at), 126) AS month,
        COUNT(*) AS orders,
        SUM(CASE WHEN status IN (N'DELIVERED', N'COMPLETED') THEN total_amount ELSE 0 END) AS revenue
      FROM dbo.orders WHERE created_at < ${window.end} ${scope}
      GROUP BY CONVERT(varchar(7), DATEADD(hour, 7, created_at), 126)
    `),
  ]);
  const daily = new Map(rows.map((row) => [row.day, row]));
  const monthly = new Map(monthlyRows.map((row) => [row.month, row]));
  return {
    monthly: monthDates([...monthly.keys()], window.dates[29]).map((day) => ({
      day,
      orders: Number(monthly.get(day.slice(0, 7))?.orders ?? 0),
      revenue: Number(monthly.get(day.slice(0, 7))?.revenue ?? 0),
    })),
    daily: window.dates.map((day) => ({
      day,
      orders: Number(daily.get(day)?.orders ?? 0),
      revenue: Number(daily.get(day)?.revenue ?? 0),
    })),
    orderStatuses: statuses.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
  };
}

export async function pointCharts(prisma: PrismaService, memberId?: string) {
  const window = chartWindow();
  const scope = memberId
    ? Prisma.sql`AND p.member_id = ${memberId}`
    : Prisma.empty;
  const [rows, monthlyRows] = await Promise.all([
    prisma.$queryRaw<
      { day: string; added: unknown; deducted: unknown }[]
    >(Prisma.sql`
    SELECT CONVERT(varchar(10), DATEADD(hour, 7, p.created_at), 23) AS day,
      SUM(CASE WHEN p.points > 0 THEN CAST(p.points AS bigint) ELSE 0 END) AS added,
      SUM(CASE WHEN p.points < 0 THEN -CAST(p.points AS bigint) ELSE 0 END) AS deducted
    FROM dbo.loyalty_point_transactions p JOIN dbo.users u ON u.id = p.member_id
    WHERE p.created_at >= ${window.start} AND p.created_at < ${window.end}
      AND u.status <> N'DELETED' ${scope}
    GROUP BY CONVERT(varchar(10), DATEADD(hour, 7, p.created_at), 23)
  `),
    prisma.$queryRaw<
      { month: string; added: unknown; deducted: unknown }[]
    >(Prisma.sql`
    SELECT CONVERT(varchar(7), DATEADD(hour, 7, p.created_at), 126) AS month,
      SUM(CASE WHEN p.points > 0 THEN CAST(p.points AS bigint) ELSE 0 END) AS added,
      SUM(CASE WHEN p.points < 0 THEN -CAST(p.points AS bigint) ELSE 0 END) AS deducted
    FROM dbo.loyalty_point_transactions p JOIN dbo.users u ON u.id = p.member_id
    WHERE p.created_at < ${window.end} AND u.status <> N'DELETED' ${scope}
    GROUP BY CONVERT(varchar(7), DATEADD(hour, 7, p.created_at), 126)
  `),
  ]);
  const map = new Map(rows.map((row) => [row.day, row]));
  const monthly = new Map(monthlyRows.map((row) => [row.month, row]));
  return {
    monthly: monthDates([...monthly.keys()], window.dates[29]).map((day) => ({
      day,
      added: Number(monthly.get(day.slice(0, 7))?.added ?? 0),
      deducted: Number(monthly.get(day.slice(0, 7))?.deducted ?? 0),
    })),
    daily: window.dates.map((day) => ({
      day,
      added: Number(map.get(day)?.added ?? 0),
      deducted: Number(map.get(day)?.deducted ?? 0),
    })),
  };
}
