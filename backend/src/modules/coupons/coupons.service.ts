import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { serialize } from '../../common/serialize';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách mã giảm giá trong hệ thống (cho Admin Portal). */
  async list() {
    const coupons = await this.prisma.coupons.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        coupon_categories: {
          include: { categories: { select: { id: true, name: true } } },
        },
      },
    });

    return serialize(
      coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discount_type,
        discountValue: Number(coupon.discount_value),
        minOrderValue: Number(coupon.min_order_value),
        maxDiscount:
          coupon.max_discount !== null ? Number(coupon.max_discount) : null,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count,
        startAt: coupon.start_at,
        endAt: coupon.end_at,
        status: coupon.status,
        categories: coupon.coupon_categories.map((cc) => cc.categories?.name),
      })),
    );
  }
}
