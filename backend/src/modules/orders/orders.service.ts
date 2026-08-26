import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { serialize } from '../../common/serialize';
import { ShopOwnershipService } from '../../common/shop-ownership.service';
import { RiskScoringService } from '../risk/risk-scoring.service';
import { NotificationsService } from '../notifications/notifications.service';

interface AuthUser {
  id: string;
  role: string;
}

const VALID_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
  'FAILED',
  'NON_RECEIVED',
] as const;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private readonly shopOwnership: ShopOwnershipService,
    @Optional() private riskScoring?: RiskScoringService,
    @Optional() private notifications?: NotificationsService,
  ) {}

  async placeOrder(buyerId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một sản phẩm');
    }

    const productIds = dto.items.map((i) => BigInt(i.productId));
    const products = await this.prisma.products.findMany({
      where: { id: { in: productIds } },
      select: { id: true, shop_id: true },
    });

    const shopIds = [...new Set(products.map((p) => p.shop_id))];
    if (shopIds.length === 0) {
      throw new BadRequestException('Không tìm thấy sản phẩm hợp lệ');
    }
    const shopId = shopIds[0];

    const order = await this.prisma.orders.create({
      data: {
        order_code: `ORD${Date.now()}`,
        buyer_id: buyerId,
        shop_id: shopId,
        shipping_receiver_name: dto.customerName,
        shipping_phone: dto.phone,
        shipping_province: '',
        shipping_district: '',
        shipping_ward: '',
        shipping_address_detail: dto.address,
        subtotal: dto.subtotal,
        shipping_fee: dto.shippingFee,
        discount_amount: dto.discount,
        total_amount: dto.total,
        status: 'CONFIRMED',
        order_items: {
          create: dto.items.map((item) => ({
            product_id: BigInt(item.productId),
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.unitPrice * item.quantity,
          })),
        },
        payments: {
          create: {
            method:
              dto.paymentMethod === 'COD'
                ? 'COD'
                : dto.paymentMethod === 'MOMO'
                  ? 'E_WALLET'
                  : 'BANK_TRANSFER',
            amount: dto.total,
            status: 'UNPAID',
          },
        },
      },
      include: { order_items: true, payments: true },
    });

    // Chấm điểm rủi ro real-time sau khi tạo đơn (best-effort, không chặn đặt hàng)
    let riskAssessment: unknown = null;
    if (this.riskScoring) {
      try {
        riskAssessment = await this.riskScoring.scoreBuyer(buyerId, order.id);
      } catch {
        // Chưa có model active hoặc lỗi scoring — bỏ qua
      }
    }

    return serialize({ ...order, riskAssessment });
  }

  /**
   * BUYER: chỉ thấy đơn của mình.
   * SELLER: chỉ thấy đơn thuộc shop mình sở hữu (shop ownership từ DB, không tin frontend).
   * ADMIN: thấy tất cả (có filter).
   */
  async getOrdersForUser(
    user: AuthUser,
    opts: { page: number; limit: number; status?: string },
  ) {
    const page = Math.max(opts.page || 1, 1);
    const limit = Math.max(opts.limit || 20, 1);

    const where: Record<string, unknown> = {};
    if (user.role === 'BUYER') {
      where.buyer_id = user.id;
    } else if (user.role === 'SELLER') {
      const ownedShopIds = await this.shopOwnership.getOwnedShopIds(user.id);
      if (ownedShopIds.length === 0) {
        return serialize({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
      where.shop_id = { in: ownedShopIds };
    }
    if (opts.status && (VALID_STATUSES as readonly string[]).includes(opts.status)) {
      where.status = opts.status;
    }

    const [total, orders] = await Promise.all([
      this.prisma.orders.count({ where }),
      this.prisma.orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { order_items: true, payments: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return serialize({
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async getOrderByIdForUser(user: AuthUser, id: bigint) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: true,
        payments: true,
        order_status_history: {
          orderBy: { created_at: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (user.role === 'BUYER' && order.buyer_id !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }
    if (user.role === 'SELLER') {
      // Ownership check qua DB — không tin shopId từ frontend
      await this.shopOwnership.getOrderForSellerOrThrow(id, user.id);
    }
    return serialize(order);
  }

  /**
   * Chuyển trạng thái đơn hàng + ghi lịch sử.
   * SELLER chỉ được cập nhật đơn của shop mình.
   */
  async updateStatus(
    id: bigint,
    newStatus: string,
    changedBy: string,
    role?: string,
  ) {
    if (!(VALID_STATUSES as readonly string[]).includes(newStatus)) {
      throw new BadRequestException(`Trạng thái không hợp lệ: ${newStatus}`);
    }

    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: { id: true, status: true, order_code: true, buyer_id: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (role === 'SELLER') {
      await this.shopOwnership.getOrderForSellerOrThrow(id, changedBy);
    }
    if (order.status === newStatus) {
      throw new BadRequestException('Đơn hàng đã ở trạng thái này');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.orders.update({
        where: { id },
        data: { status: newStatus as never },
      }),
      this.prisma.order_status_history.create({
        data: {
          order_id: id,
          old_status: order.status,
          new_status: newStatus as never,
          changed_by: changedBy,
        },
      }),
    ]);

    // Thông báo cho buyer về thay đổi trạng thái (best-effort)
    if (this.notifications) {
      try {
        await this.notifications.notify(
          order.buyer_id,
          'Cập nhật đơn hàng',
          `Đơn hàng #${order.order_code} đã chuyển sang trạng thái ${newStatus}`,
          'ORDER_UPDATE',
          'ORDER',
          id,
        );
      } catch {
        // bỏ qua lỗi notification
      }
    }

    return serialize(updated);
  }
}