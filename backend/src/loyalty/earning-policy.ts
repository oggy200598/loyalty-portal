import { Prisma } from '../../generated/prisma/client';

export interface TierDefinition {
  code: string;
  name: string;
  minimumSpend: number;
  multiplierBps: number;
  benefits?: string;
}

export interface LoyaltyRuleConfig {
  spendPerPoint: number;
  expiryDays: number;
  tierPeriodDays: number;
  tiers: TierDefinition[];
}

export const DEFAULT_LOYALTY_RULE: LoyaltyRuleConfig = {
  spendPerPoint: 10000,
  expiryDays: 365,
  tierPeriodDays: 365,
  tiers: [
    { code: 'BRONZE', name: 'Đồng', minimumSpend: 0, multiplierBps: 10000 },
    {
      code: 'SILVER',
      name: 'Bạc',
      minimumSpend: 2000000,
      multiplierBps: 11000,
    },
    {
      code: 'GOLD',
      name: 'Vàng',
      minimumSpend: 10000000,
      multiplierBps: 12500,
    },
    {
      code: 'PLATINUM',
      name: 'Bạch kim',
      minimumSpend: 30000000,
      multiplierBps: 15000,
    },
  ],
};

/** Monetary arithmetic stays decimal; rounding happens once at the point boundary. */
export class EarningPolicy {
  readonly config: LoyaltyRuleConfig;

  constructor(value: unknown) {
    const config = (
      typeof value === 'string' ? JSON.parse(value) : value
    ) as LoyaltyRuleConfig;
    if (
      !config ||
      !Number.isSafeInteger(config.spendPerPoint) ||
      config.spendPerPoint < 1 ||
      !Number.isInteger(config.expiryDays) ||
      config.expiryDays < 1 ||
      config.expiryDays > 3650 ||
      !Number.isInteger(config.tierPeriodDays) ||
      config.tierPeriodDays < 1 ||
      config.tierPeriodDays > 3650 ||
      !Array.isArray(config.tiers) ||
      config.tiers.length < 1 ||
      config.tiers.length > 10
    ) {
      throw new Error('Chính sách tích điểm không hợp lệ');
    }
    const codes = new Set<string>();
    config.tiers.forEach((tier, index) => {
      if (
        !/^[A-Z][A-Z0-9_]{0,29}$/.test(tier.code) ||
        codes.has(tier.code) ||
        typeof tier.name !== 'string' ||
        !tier.name.trim() ||
        tier.name.length > 100 ||
        !Number.isSafeInteger(tier.minimumSpend) ||
        tier.minimumSpend < 0 ||
        !Number.isInteger(tier.multiplierBps) ||
        tier.multiplierBps < 1 ||
        tier.multiplierBps > 100000 ||
        (tier.benefits !== undefined &&
          (typeof tier.benefits !== 'string' || tier.benefits.length > 500)) ||
        (index === 0
          ? tier.minimumSpend !== 0
          : tier.minimumSpend <= config.tiers[index - 1].minimumSpend)
      ) {
        throw new Error('Các hạng phải có mã duy nhất và ngưỡng tăng dần từ 0');
      }
      codes.add(tier.code);
    });
    this.config = structuredClone(config);
  }

  tierFor(spend: Prisma.Decimal | number | string): TierDefinition {
    const amount = new Prisma.Decimal(spend);
    return this.config.tiers
      .filter((tier) => amount.gte(tier.minimumSpend))
      .at(-1)!;
  }

  pointsFor(
    amount: Prisma.Decimal | string | number,
    spend: Prisma.Decimal | string | number,
  ): number {
    const points = Prisma.Decimal.max(new Prisma.Decimal(amount), 0)
      .div(this.config.spendPerPoint)
      .mul(this.tierFor(spend).multiplierBps)
      .div(10000)
      .floor();
    if (points.gt(100000000))
      throw new Error('Số điểm vượt giới hạn cho một giao dịch');
    return points.toNumber();
  }

  expiresAt(now: Date): Date {
    return new Date(now.getTime() + this.config.expiryDays * 86400000);
  }
}
