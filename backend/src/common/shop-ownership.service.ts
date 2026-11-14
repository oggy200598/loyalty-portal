import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Shop ownership resolution.
 *
 * Quy tắc: KHÔNG tin shopId/sellerId từ frontend.
 * Backend lấy userId từ JWT rồi query database để xác định shop ownership
 * (qua shops.owner_id và shop_members).
 */
@Injectable()
export class ShopOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách shopId mà user sở hữu / là thành viên. */
  async getOwnedShopIds(userId: string): Promise<bigint[]> {
    const [owned, memberOf] = await Promise.all([
      this.prisma.shops.findMany({
        where: { owner_id: userId },
        select: { id: true },
      }),
      this.prisma.shop_members.findMany({
        where: { user_id: userId },
        select: { shop_id: true },
      }),
    ]);

    const ids = [...owned.map((s) => s.id), ...memberOf.map((m) => m.shop_id)];
    return [...new Set(ids)];
  }

  /** Kiểm tra user có quyền trên shop hay không. */
  async ownsShop(userId: string, shopId: bigint): Promise<boolean> {
    const [owned, member] = await Promise.all([
      this.prisma.shops.findFirst({
        where: { id: shopId, owner_id: userId },
        select: { id: true },
      }),
      this.prisma.shop_members.findFirst({
        where: { shop_id: shopId, user_id: userId },
        select: { shop_id: true },
      }),
    ]);
    return Boolean(owned || member);
  }

  /**
   * Lấy order + kiểm tra seller hiện tại sở hữu shop của order.
   * Ném ForbiddenException nếu order không thuộc seller.
   */
  async getOrderForSellerOrThrow(orderId: bigint, sellerId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này');
    }

    const isOwner = await this.ownsShop(sellerId, order.shop_id);
    if (!isOwner) {
      throw new ForbiddenException('Đơn hàng không thuộc shop của bạn');
    }

    return order;
  }
}
