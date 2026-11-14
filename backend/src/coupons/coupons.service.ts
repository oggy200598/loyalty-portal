import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { coupons } from '../../generated/prisma/client';
import type {
  CouponDetailsDto,
  CreateCouponDto,
  UpdateCouponDto,
} from './coupons.dto';
import { PrismaService } from '../database/prisma.service';
import { serialize } from '../common/serialize';

const versionOf = (coupon: coupons) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        serialize({
          id: coupon.id,
          name: coupon.name,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          min_order_value: coupon.min_order_value,
          max_discount: coupon.max_discount,
          usage_limit: coupon.usage_limit,
          used_count: coupon.used_count,
          start_at: coupon.start_at,
          end_at: coupon.end_at,
          status: coupon.status,
          updated_at: coupon.updated_at,
        }),
      ),
    )
    .digest('hex');

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách mã giảm giá trong hệ thống (cho Admin Portal). */
  async list() {
    const coupons = await this.prisma.coupons.findMany({
      where: { loyalty_owner_id: null },
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
        version: versionOf(coupon),
        categories: coupon.coupon_categories.map((cc) => cc.categories?.name),
      })),
    );
  }

  private validateDetails(dto: CouponDetailsDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (end <= start)
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu.');
    if (
      dto.discountType === 'PERCENT' &&
      (dto.discountValue <= 0 || dto.discountValue > 100)
    )
      throw new BadRequestException(
        'Mức giảm phần trăm phải lớn hơn 0 và không vượt quá 100.',
      );
    if (dto.discountType === 'FIXED' && dto.discountValue <= 0)
      throw new BadRequestException('Số tiền giảm phải lớn hơn 0.');
    return { start, end };
  }

  async create(actor: string, dto: CreateCouponDto) {
    const { start, end } = this.validateDetails(dto);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const coupon = await tx.coupons.create({
          data: {
            code: dto.code,
            name: dto.name,
            discount_type: dto.discountType,
            discount_value:
              dto.discountType === 'FREE_SHIP' ? 0 : dto.discountValue,
            min_order_value: dto.minOrderValue,
            max_discount: dto.maxDiscount,
            usage_limit: dto.usageLimit,
            start_at: start,
            end_at: end,
            status: dto.status,
          },
        });
        await tx.audit_logs.create({
          data: {
            user_id: actor,
            action: 'COUPON_CREATED',
            entity_type: 'COUPON',
            entity_id: coupon.id,
            new_data: JSON.stringify(serialize(coupon)),
          },
        });
        return serialize({ id: coupon.id, code: coupon.code });
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Mã giảm giá đã tồn tại. Vui lòng chọn mã khác.',
        );
      throw error;
    }
  }

  async update(id: bigint, actor: string, dto: UpdateCouponDto) {
    const { start, end } = this.validateDetails(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM coupons WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
      const before = await tx.coupons.findUnique({ where: { id } });
      if (!before || before.loyalty_owner_id)
        throw new NotFoundException('Không tìm thấy mã giảm giá dùng chung.');
      if (versionOf(before) !== dto.expectedVersion)
        throw new ConflictException(
          'Mã giảm giá đã thay đổi hoặc vừa được sử dụng. Vui lòng tải lại trước khi chỉnh sửa.',
        );
      if (dto.usageLimit !== null && dto.usageLimit < before.used_count)
        throw new BadRequestException(
          'Giới hạn sử dụng không được nhỏ hơn số lượt đã dùng.',
        );
      const after = await tx.coupons.update({
        where: { id },
        data: {
          name: dto.name,
          discount_type: dto.discountType,
          discount_value:
            dto.discountType === 'FREE_SHIP' ? 0 : dto.discountValue,
          min_order_value: dto.minOrderValue,
          max_discount: dto.maxDiscount,
          usage_limit: dto.usageLimit,
          start_at: start,
          end_at: end,
          status: dto.status,
          updated_at: new Date(
            Math.max(Date.now(), before.updated_at.getTime() + 1),
          ),
        },
      });
      await tx.audit_logs.create({
        data: {
          user_id: actor,
          action: 'COUPON_UPDATED',
          entity_type: 'COUPON',
          entity_id: id,
          old_data: JSON.stringify(serialize(before)),
          new_data: JSON.stringify(serialize(after)),
        },
      });
      return serialize({ id: after.id, version: versionOf(after) });
    });
  }
}
