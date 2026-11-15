import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto, QuoteOrderDto } from './orders.dto';

const money = (value: ConstructorParameters<typeof Prisma.Decimal>[0]) =>
  new Prisma.Decimal(value).toDecimalPlaces(2);

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async calculate(
    tx: Prisma.TransactionClient,
    dto: QuoteOrderDto,
    buyerId?: string,
  ) {
    if (!dto.items?.length) throw new BadRequestException('Giỏ hàng trống');
    const merged = new Map<
      string,
      { productId: number; variantId?: number; quantity: number }
    >();
    for (const item of dto.items) {
      if (
        !Number.isSafeInteger(item.productId) ||
        item.productId < 1 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        (item.variantId != null &&
          (!Number.isSafeInteger(item.variantId) || item.variantId < 1))
      ) {
        throw new BadRequestException('Sản phẩm hoặc số lượng không hợp lệ');
      }
      const key = `${item.productId}:${item.variantId ?? ''}`;
      const existing = merged.get(key);
      merged.set(key, {
        ...item,
        quantity: item.quantity + (existing?.quantity ?? 0),
      });
    }
    const products = await tx.products.findMany({
      where: {
        id: { in: [...merged.values()].map((item) => BigInt(item.productId)) },
      },
      include: { product_variants: true, shops: true },
    });
    const lines = [...merged.values()].map((item) => {
      const product = products.find((p) => p.id === BigInt(item.productId));
      if (
        !product ||
        product.status !== 'ACTIVE' ||
        product.shops.status !== 'ACTIVE'
      )
        throw new BadRequestException('Sản phẩm không còn được bán');
      const variant =
        item.variantId == null
          ? null
          : product.product_variants.find(
              (v) => v.id === BigInt(item.variantId!),
            );
      if (item.variantId != null && !variant)
        throw new BadRequestException('Biến thể không thuộc sản phẩm');
      if (product.product_variants.length && !variant)
        throw new BadRequestException('Vui lòng chọn biến thể sản phẩm');
      if ((variant?.stock_quantity ?? product.stock_quantity) < item.quantity)
        throw new BadRequestException('Không đủ tồn kho');
      const unitPrice = money(variant?.price ?? product.price);
      return {
        product,
        variant,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice.mul(item.quantity),
      };
    });
    for (const product of products) {
      const quantity = lines
        .filter((line) => line.product.id === product.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      if (quantity > product.stock_quantity)
        throw new BadRequestException('Không đủ tồn kho sản phẩm');
    }
    const coupon = dto.couponCode
      ? await tx.coupons.findUnique({
          where: { code: dto.couponCode.trim() },
          include: { coupon_categories: true },
        })
      : null;
    const now = new Date();
    if (
      dto.couponCode &&
      (!coupon ||
        coupon.status !== 'ACTIVE' ||
        (coupon.loyalty_owner_id != null &&
          coupon.loyalty_owner_id !== buyerId) ||
        coupon.start_at > now ||
        coupon.end_at <= now ||
        (coupon.usage_limit !== null &&
          coupon.used_count >= coupon.usage_limit))
    )
      throw new BadRequestException('Mã giảm giá không khả dụng');
    const eligible = (line: (typeof lines)[number]) =>
      !coupon?.coupon_categories.length ||
      coupon.coupon_categories.some(
        (category) => category.category_id === line.product.category_id,
      );
    const eligibleTotal = lines
      .filter(eligible)
      .reduce((sum, line) => sum.add(line.subtotal), money(0));
    if (
      coupon &&
      (eligibleTotal.isZero() || eligibleTotal.lt(coupon.min_order_value))
    )
      throw new BadRequestException(
        'Đơn hàng chưa đủ điều kiện dùng mã giảm giá',
      );
    let discount = money(0);
    if (coupon?.discount_type === 'FIXED')
      discount = money(coupon.discount_value);
    if (coupon?.discount_type === 'PERCENT')
      discount = money(eligibleTotal.mul(coupon.discount_value).div(100));
    if (coupon?.max_discount != null)
      discount = Prisma.Decimal.min(discount, coupon.max_discount);
    discount = money(Prisma.Decimal.min(discount, eligibleTotal));
    const settings = await tx.system_settings.findUniqueOrThrow({
      where: { id: 1 },
    });
    const shopIds = [...new Set(lines.map((line) => line.product.shop_id))];
    let allocated = money(0);
    const eligibleShops = shopIds.filter((id) =>
      lines.some((line) => line.product.shop_id === id && eligible(line)),
    );
    const groups = shopIds.map((shopId) => {
      const items = lines.filter((line) => line.product.shop_id === shopId);
      const subtotal = items.reduce(
        (sum, line) => sum.add(line.subtotal),
        money(0),
      );
      const eligibleSubtotal = items
        .filter(eligible)
        .reduce((sum, line) => sum.add(line.subtotal), money(0));
      const groupDiscount = eligibleSubtotal.isZero()
        ? money(0)
        : shopId === eligibleShops.at(-1)
          ? discount.sub(allocated)
          : Prisma.Decimal.min(
              money(discount.mul(eligibleSubtotal).div(eligibleTotal)),
              discount.sub(allocated),
            );
      allocated = allocated.add(groupDiscount);
      const shippingFee =
        subtotal.gte(settings.free_shipping_threshold) ||
        (coupon?.discount_type === 'FREE_SHIP' && eligibleSubtotal.gt(0))
          ? money(0)
          : money(settings.shipping_fee);
      return {
        shopId,
        items,
        subtotal,
        discount: groupDiscount,
        shippingFee,
        total: subtotal.sub(groupDiscount).add(shippingFee),
      };
    });
    return {
      groups,
      coupon,
      subtotal: groups.reduce((s, g) => s.add(g.subtotal), money(0)),
      discount,
      shippingFee: groups.reduce((s, g) => s.add(g.shippingFee), money(0)),
      total: groups.reduce((s, g) => s.add(g.total), money(0)),
    };
  }

  async quote(dto: QuoteOrderDto, buyerId?: string) {
    const result = await this.calculate(this.prisma, dto, buyerId);
    return {
      subtotal: result.subtotal,
      discount: result.discount,
      shippingFee: result.shippingFee,
      total: result.total,
      groups: result.groups.map((group) => ({
        shopId: group.shopId,
        subtotal: group.subtotal,
        discount: group.discount,
        shippingFee: group.shippingFee,
        total: group.total,
      })),
    };
  }

  async place(buyerId: string, dto: CreateOrderDto) {
    return this.prisma
      .$transaction(
        async (tx) => {
          const { groups, coupon, total } = await this.calculate(
            tx,
            dto,
            buyerId,
          );
          if (dto.expectedTotal != null && !total.equals(dto.expectedTotal))
            throw new ConflictException(
              'Giá hoặc ưu đãi đã thay đổi, vui lòng cập nhật báo giá',
            );
          if (coupon) {
            const redeemed = await tx.coupons.updateMany({
              where: { id: coupon.id, used_count: coupon.used_count },
              data: { used_count: { increment: 1 } },
            });
            if (redeemed.count !== 1)
              throw new BadRequestException(
                'Mã giảm giá vừa được sử dụng hết, vui lòng tải lại',
              );
          }
          const orders: Prisma.ordersGetPayload<{
            include: { order_items: true; payments: true };
          }>[] = [];
          for (const group of groups) {
            for (const line of group.items) {
              const product = await tx.products.updateMany({
                where: {
                  id: line.product.id,
                  status: 'ACTIVE',
                  stock_quantity: { gte: line.quantity },
                },
                data: { stock_quantity: { decrement: line.quantity } },
              });
              if (product.count !== 1)
                throw new BadRequestException('Sản phẩm vừa hết hàng');
              if (line.variant) {
                const variant = await tx.product_variants.updateMany({
                  where: {
                    id: line.variant.id,
                    product_id: line.product.id,
                    stock_quantity: { gte: line.quantity },
                  },
                  data: { stock_quantity: { decrement: line.quantity } },
                });
                if (variant.count !== 1)
                  throw new BadRequestException('Biến thể vừa hết hàng');
              }
            }
            const order = await tx.orders.create({
              data: {
                order_code: `ORD-${randomUUID()}`,
                buyer_id: buyerId,
                shop_id: group.shopId,
                shipping_receiver_name: dto.customerName.trim(),
                shipping_phone: dto.phone,
                shipping_province: '',
                shipping_district: '',
                shipping_ward: '',
                shipping_address_detail: dto.address.trim(),
                subtotal: group.subtotal,
                shipping_fee: group.shippingFee,
                discount_amount: group.discount,
                total_amount: group.total,
                status: 'CONFIRMED',
                order_items: {
                  create: group.items.map((line) => ({
                    product_id: line.product.id,
                    variant_id: line.variant?.id,
                    product_name:
                      line.product.name +
                      (line.variant ? ` — ${line.variant.variant_name}` : ''),
                    quantity: line.quantity,
                    unit_price: line.unitPrice,
                    subtotal: line.subtotal,
                  })),
                },
                order_status_history: {
                  create: {
                    old_status: null,
                    new_status: 'CONFIRMED',
                    changed_by: buyerId,
                  },
                },
                payments: {
                  create: {
                    method:
                      dto.paymentMethod === 'MOMO'
                        ? 'E_WALLET'
                        : dto.paymentMethod === 'BANK'
                          ? 'BANK_TRANSFER'
                          : (dto.paymentMethod as
                              'COD' | 'BANK_TRANSFER' | 'CREDIT_CARD'),
                    amount: group.total,
                    status: 'UNPAID',
                  },
                },
              },
              include: { order_items: true, payments: true },
            });
            orders.push(order);
            for (const line of group.items) {
              const cartItem = await tx.cart_items.findFirst({
                where: {
                  carts: { user_id: buyerId },
                  product_id: line.product.id,
                  variant_id: line.variant?.id ?? null,
                },
              });
              if (cartItem) {
                if (cartItem.quantity <= line.quantity)
                  await tx.cart_items.delete({ where: { id: cartItem.id } });
                else
                  await tx.cart_items.update({
                    where: { id: cartItem.id },
                    data: { quantity: { decrement: line.quantity } },
                  });
              }
            }
          }
          return orders;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        )
          throw new ConflictException(
            'Giỏ hàng vừa thay đổi, vui lòng tải lại và thử lại',
          );
        throw error;
      });
  }
}
