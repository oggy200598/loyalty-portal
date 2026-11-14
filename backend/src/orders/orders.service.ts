import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Optional,
  ConflictException,
} from '@nestjs/common';
import { LoyaltyOrdersService } from '../loyalty/loyalty-orders.service';
import { ConfirmCodPaymentDto } from '../loyalty/loyalty.dto';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './create-order.dto';
import { serialize } from '../common/serialize';
import { ShopOwnershipService } from '../common/shop-ownership.service';
import { RiskScoringService } from '../risk/risk-scoring.service';
import { CheckoutService } from './checkout.service';
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
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
  FAILED: 'Giao thất bại',
  NON_RECEIVED: 'Không nhận hàng',
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private readonly shopOwnership: ShopOwnershipService,
    private readonly checkout: CheckoutService,
    @Optional() private riskScoring?: RiskScoringService,
    @Optional() private notifications?: NotificationsService,
    @Optional() private loyalty?: LoyaltyOrdersService,
  ) {}

  async placeOrder(buyerId: string, dto: CreateOrderDto) {
    const orders = await this.checkout.place(buyerId, dto);
    const assessed = await Promise.all(
      orders.map(async (order) => {
        let riskAssessment: unknown = null;
        if (this.riskScoring) {
          try {
            riskAssessment = await this.riskScoring.scoreBuyer(
              buyerId,
              order.id,
            );
          } catch {
            /* Orders remain confirmed if assessment is unavailable. */
          }
        }
        return { ...order, riskAssessment };
      }),
    );
    return serialize({ ...assessed[0], orders: assessed });
  }

  async confirmCodPayment(
    id: bigint,
    user: AuthUser,
    dto: ConfirmCodPaymentDto,
  ) {
    if (!['ADMIN', 'SELLER'].includes(user.role))
      throw new ForbiddenException('Không có quyền xác nhận thanh toán');
    if (user.role === 'SELLER')
      await this.shopOwnership.getOrderForSellerOrThrow(id, user.id);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
        const order = await tx.orders.findUnique({
          where: { id },
          include: { payments: true },
        });
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
        if (!['DELIVERED', 'COMPLETED'].includes(order.status))
          throw new BadRequestException(
            'Chỉ xác nhận thu hộ khi đơn đã giao hoặc hoàn tất',
          );
        if (order.payments.length !== 1 || order.payments[0].method !== 'COD')
          throw new BadRequestException(
            'Chỉ hỗ trợ xác nhận thu hộ COD tại đây',
          );
        const payment = order.payments[0];
        if (!['UNPAID', 'PAID'].includes(order.payment_status))
          throw new BadRequestException(
            'Khoản thanh toán đã được hoàn hoặc không còn phù hợp để xác nhận thu hộ',
          );
        if (!payment.amount.equals(order.total_amount))
          throw new BadRequestException('Thông tin thanh toán không khớp');
        if (payment.status === 'PAID' && !payment.paid_at)
          throw new BadRequestException(
            'Khoản đã thu thiếu thời điểm xác nhận',
          );
        if (payment.status !== 'PAID') {
          if (
            payment.status !== 'UNPAID' ||
            !payment.amount.equals(order.total_amount)
          )
            throw new BadRequestException('Thông tin thanh toán không khớp');
          await tx.payments.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              paid_at: new Date(),
              transaction_code: dto.reference.trim().slice(0, 100),
            },
          });
          await tx.orders.update({
            where: { id },
            data: { payment_status: 'PAID' },
          });
          await tx.audit_logs.create({
            data: {
              user_id: user.id,
              action: 'COD_PAYMENT_CONFIRMED',
              entity_type: 'ORDER',
              entity_id: id,
              new_data: JSON.stringify({ reference: dto.reference.trim() }),
            },
          });
        }
        await tx.orders.update({
          where: { id },
          data: { payment_status: 'PAID' },
        });
        if (this.loyalty) await this.loyalty.syncOrder(tx, id);
        return { success: true, paymentStatus: 'PAID' };
      },
      { timeout: 15000 },
    );
  }

  /**
   * BUYER: chỉ thấy đơn của mình.
   * SELLER: chỉ thấy đơn thuộc shop mình sở hữu (shop ownership từ DB, không tin frontend).
   * ADMIN: thấy tất cả (có filter).
   */
  async getOrdersForUser(
    user: AuthUser,
    opts: {
      page: number;
      limit: number;
      status?: string;
      q?: string;
      paymentStatus?: string;
    },
  ) {
    const page = Math.max(opts.page || 1, 1);
    const limit = Math.max(opts.limit || 20, 1);

    const where: Record<string, unknown> = {};
    if (opts.q)
      where.OR = [
        { order_code: { contains: opts.q } },
        { shipping_receiver_name: { contains: opts.q } },
        { shipping_phone: { contains: opts.q } },
        { users: { email: { contains: opts.q } } },
      ];
    if (opts.paymentStatus) where.payment_status = opts.paymentStatus;
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
    if (
      opts.status &&
      (VALID_STATUSES as readonly string[]).includes(opts.status)
    ) {
      where.status = opts.status;
    }

    const [total, orders] = await Promise.all([
      this.prisma.orders.count({ where }),
      this.prisma.orders.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
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
    expectedStatus?: string,
  ) {
    if (!(VALID_STATUSES as readonly string[]).includes(newStatus)) {
      throw new BadRequestException('Trạng thái đơn hàng không hợp lệ.');
    }

    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: { id: true, status: true, order_code: true, buyer_id: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (
      role === 'BUYER' &&
      (order.buyer_id !== changedBy || newStatus !== 'CANCELLED')
    )
      throw new ForbiddenException('Không có quyền hủy đơn này.');
    if (expectedStatus && order.status !== expectedStatus)
      throw new ConflictException(
        'Đơn đã thay đổi. Hãy tải lại trước khi xử lý.',
      );
    if (role === 'BUYER' && !['PENDING', 'CONFIRMED'].includes(order.status))
      throw new BadRequestException(
        'Đơn đã được xử lý, không còn tự hủy được.',
      );
    if (role === 'SELLER') {
      await this.shopOwnership.getOrderForSellerOrThrow(id, changedBy);
    }
    if (order.status === newStatus) {
      throw new BadRequestException('Đơn hàng đã ở trạng thái này');
    }

    const transitions: Record<string, readonly string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPING', 'CANCELLED'],
      SHIPPING: ['DELIVERED', 'FAILED', 'NON_RECEIVED'],
      DELIVERED: ['COMPLETED', 'RETURNED'],
      COMPLETED: ['RETURNED'],
      CANCELLED: [],
      RETURNED: [],
      FAILED: [],
      NON_RECEIVED: [],
    };
    if (!transitions[order.status]?.includes(newStatus))
      throw new BadRequestException(
        'Không được chuyển trạng thái đơn hàng theo hướng này',
      );
    const updated = await this.prisma
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=${id}`;
        const current = await tx.orders.findUnique({
          where: { id },
          select: { status: true, payment_status: true },
        });
        if (!current) throw new NotFoundException('Không tìm thấy đơn hàng');
        if (current.status !== order.status)
          throw new ConflictException(
            'Đơn đã thay đổi. Hãy tải lại trước khi xử lý.',
          );
        if (role === 'BUYER' && current.payment_status !== 'UNPAID')
          throw new BadRequestException(
            'Đơn đã thanh toán cần liên hệ hỗ trợ để hủy và đối soát.',
          );
        const previousHistory = await tx.order_status_history.findFirst({
          where: { order_id: id },
          orderBy: { id: 'desc' },
        });
        const result = await tx.orders.update({
          where: { id, status: order.status },
          data: { status: newStatus as never },
        });
        // An existing database trigger may already have inserted the transition.
        const history = await tx.order_status_history.findFirst({
          where: { order_id: id },
          orderBy: { id: 'desc' },
        });
        if (
          history &&
          history.id !== previousHistory?.id &&
          history.new_status === newStatus &&
          history.old_status === order.status
        ) {
          await tx.order_status_history.update({
            where: { id: history.id },
            data: { changed_by: changedBy },
          });
        } else {
          await tx.order_status_history.create({
            data: {
              order_id: id,
              old_status: order.status,
              new_status: newStatus as never,
              changed_by: changedBy,
            },
          });
        }
        // Pre-upgrade orders did not reserve stock. Only the new UUID order format has reservations.
        if (
          newStatus === 'CANCELLED' &&
          /^ORD-[a-f0-9-]{36}$/.test(order.order_code)
        ) {
          const items = await tx.order_items.findMany({
            where: { order_id: id },
          });
          for (const item of items) {
            await tx.products.update({
              where: { id: item.product_id },
              data: { stock_quantity: { increment: item.quantity } },
            });
            if (item.variant_id)
              await tx.product_variants.update({
                where: { id: item.variant_id },
                data: { stock_quantity: { increment: item.quantity } },
              });
          }
        }
        if (this.loyalty) await this.loyalty.syncOrder(tx, id);
        await tx.audit_logs.create({
          data: {
            user_id: changedBy,
            action: 'ORDER_STATUS_UPDATED',
            entity_type: 'ORDER',
            entity_id: id,
            old_data: JSON.stringify({ status: order.status }),
            new_data: JSON.stringify({ status: newStatus }),
          },
        });
        await tx.notifications.create({
          data: {
            user_id: order.buyer_id,
            title: 'Cập nhật đơn hàng',
            message: `Đơn hàng #${order.order_code} đã chuyển sang trạng thái ${STATUS_LABELS[newStatus]}`,
            type: 'ORDER_UPDATE',
            reference_type: 'ORDER',
            reference_id: id,
          },
        });
        return result;
      })
      .catch((error: unknown) => {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2025'
        )
          throw new ConflictException('Đơn đã thay đổi. Hãy tải lại.');
        throw error;
      });

    if (this.riskScoring) {
      try {
        await this.riskScoring.refreshFeatures(order.buyer_id);
      } catch {
        /* A later scoring request refreshes the feature store. */
      }
    }

    return serialize(updated);
  }
}
