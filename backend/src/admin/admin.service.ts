import { orderCharts } from '../common/dashboard-charts';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { serialize } from '../common/serialize';
import { UsersQueryDto } from './admin-users-query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tổng quan hệ thống cho Admin Dashboard. */
  async getOverview() {
    const [
      totalUsers,
      totalBuyers,
      totalSellers,
      totalShops,
      totalProducts,
      totalOrders,
      activeCoupons,
      highRiskPredictions,
      activeModels,
      auditLogCount,
    ] = await Promise.all([
      this.prisma.users.count(),
      this.countByRole('BUYER'),
      this.countByRole('SELLER'),
      this.prisma.shops.count(),
      this.prisma.products.count(),
      this.prisma.orders.count(),
      this.prisma.coupons.count({ where: { status: 'ACTIVE' } }),
      this.prisma.risk_predictions.count({
        where: { risk_level: { in: ['HIGH', 'CRITICAL'] } },
      }),
      this.prisma.ml_models.count({ where: { is_active: true } }),
      this.prisma.audit_logs.count(),
    ]);

    const revenueAgg = await this.prisma.orders.aggregate({
      _sum: { total_amount: true },
      where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
    });

    const charts = await orderCharts(this.prisma);

    return serialize({
      totalUsers,
      totalBuyers,
      totalSellers,
      totalShops,
      totalProducts,
      totalOrders,
      totalRevenue: Number(revenueAgg._sum.total_amount ?? 0),
      activeCoupons,
      highRiskPredictions,
      activeModels,
      auditLogCount,
      charts,
    });
  }

  async listUsers(query: UsersQueryDto) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q } },
              { full_name: { contains: query.q } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [total, users] = await this.prisma.$transaction([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user_roles: { include: { roles: true } },
          _count: { select: { orders: true } },
          loyalty_member: {
            select: { tier_code: true, balance: true, joined_at: true },
          },
        },
      }),
    ]);

    return serialize({
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        roles: user.user_roles.map((ur) => ur.roles.name),
        orderCount: user._count.orders,
        loyalty: user.loyalty_member,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  }

  async listSellers() {
    const sellerRoles = await this.prisma.user_roles.findMany({
      where: { roles: { name: 'SELLER' } },
      select: { user_id: true },
    });

    const sellerIds = sellerRoles.map((r) => r.user_id);
    if (sellerIds.length === 0) return [];

    const users = await this.prisma.users.findMany({
      where: { id: { in: sellerIds } },
      include: {
        shops: {
          select: {
            id: true,
            name: true,
            status: true,
            _count: { select: { products: true, orders: true } },
          },
        },
      },
    });

    return serialize(
      users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        status: user.status,
        createdAt: user.created_at,
        shops: user.shops.map((shop) => ({
          id: shop.id,
          name: shop.name,
          status: shop.status,
          productCount: shop._count.products,
          orderCount: shop._count.orders,
        })),
      })),
    );
  }

  async listShops() {
    const shops = await this.prisma.shops.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        users: { select: { id: true, full_name: true, email: true } },
        _count: { select: { products: true, orders: true } },
      },
    });

    return serialize(
      shops.map((shop) => ({
        id: shop.id,
        name: shop.name,
        description: shop.description,
        status: shop.status,
        createdAt: shop.created_at,
        owner: shop.users
          ? {
              id: shop.users.id,
              name: shop.users.full_name,
              email: shop.users.email,
            }
          : null,
        productCount: shop._count.products,
        orderCount: shop._count.orders,
      })),
    );
  }

  async listAuditLogs(limit = 50) {
    const logs = await this.prisma.audit_logs.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        users: { select: { id: true, full_name: true, email: true } },
      },
    });

    return serialize(logs);
  }

  async listMlModels() {
    const models = await this.prisma.ml_models.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { risk_predictions: true, ml_training_runs: true } },
      },
    });

    return serialize(
      models.map((model) => ({
        id: model.id,
        modelName: model.model_name,
        algorithm: model.algorithm,
        version: model.version,
        accuracy: model.accuracy !== null ? Number(model.accuracy) : null,
        f1Score: model.f1_score !== null ? Number(model.f1_score) : null,
        rocAuc: model.roc_auc !== null ? Number(model.roc_auc) : null,
        isActive: model.is_active,
        createdAt: model.created_at,
        predictionCount: model._count.risk_predictions,
        trainingRunCount: model._count.ml_training_runs,
      })),
    );
  }

  private async countByRole(roleName: string): Promise<number> {
    return this.prisma.user_roles.count({
      where: { roles: { name: roleName } },
    });
  }
}
