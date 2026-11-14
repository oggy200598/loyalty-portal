import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { serialize } from '../common/serialize';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [products, shops, orders, users] = await this.prisma.$transaction([
      this.prisma.products.count(),
      this.prisma.shops.count(),
      this.prisma.orders.count(),
      this.prisma.users.count(),
    ]);

    return serialize({
      totalProducts: products,
      totalShops: shops,
      totalOrders: orders,
      totalUsers: users,
    });
  }
}
