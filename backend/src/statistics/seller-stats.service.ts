import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ShopOwnershipService } from '../common/shop-ownership.service';
import { serialize } from '../common/serialize';
import { orderCharts } from '../common/dashboard-charts';

@Injectable()
export class SellerStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopOwnership: ShopOwnershipService,
  ) {}

  /** Thống kê tổng quan cho Seller Dashboard — chỉ tính trên shop của seller. */
  async getOverview(sellerId: string) {
    const ownedShopIds = await this.shopOwnership.getOwnedShopIds(sellerId);

    if (ownedShopIds.length === 0) {
      return serialize({
        shopCount: 0,
        revenue: 0,
        orders: 0,
        products: 0,
        pendingOrders: 0,
        highRiskOrders: 0,
        completedOrders: 0,
        charts: await orderCharts(this.prisma, []),
      });
    }

    const whereShop = { shop_id: { in: ownedShopIds } };

    const [revenueAgg, totalOrders, pendingOrders, productCount, highRisk] =
      await Promise.all([
        this.prisma.orders.aggregate({
          _sum: { total_amount: true },
          where: { ...whereShop, status: { in: ['COMPLETED', 'DELIVERED'] } },
        }),
        this.prisma.orders.count({ where: whereShop }),
        this.prisma.orders.count({
          where: { ...whereShop, status: 'PENDING' },
        }),
        this.prisma.products.count({ where: whereShop }),
        this.prisma.risk_predictions.count({
          where: {
            risk_level: { in: ['HIGH', 'CRITICAL'] },
            orders: { shop_id: { in: ownedShopIds } },
          },
        }),
      ]);

    return serialize({
      shopCount: ownedShopIds.length,
      revenue: Number(revenueAgg._sum.total_amount ?? 0),
      orders: totalOrders,
      products: productCount,
      pendingOrders,
      highRiskOrders: highRisk,
      charts: await orderCharts(this.prisma, ownedShopIds),
      completedOrders: await this.prisma.orders.count({
        where: { ...whereShop, status: 'COMPLETED' },
      }),
    });
  }

  /** Sản phẩm của seller (mọi trạng thái) — cho trang /seller/products. */
  async getMyProducts(sellerId: string) {
    const ownedShopIds = await this.shopOwnership.getOwnedShopIds(sellerId);
    if (ownedShopIds.length === 0) return [];

    const products = await this.prisma.products.findMany({
      where: { shop_id: { in: ownedShopIds } },
      orderBy: { created_at: 'desc' },
      take: 200,
      include: {
        shops: { select: { id: true, name: true } },
        categories: { select: { id: true, name: true } },
        product_images: {
          select: { image_url: true, is_primary: true },
        },
      },
    });

    return serialize(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        stockQuantity: product.stock_quantity,
        status: product.status,
        category: product.categories?.name ?? null,
        shop: product.shops,
        imageUrl:
          product.product_images.find((image) => image.is_primary)?.image_url ??
          product.product_images[0]?.image_url ??
          null,
      })),
    );
  }
}
