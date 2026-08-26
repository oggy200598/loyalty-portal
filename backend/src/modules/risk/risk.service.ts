import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { serialize } from '../../common/serialize';
import { ShopOwnershipService } from '../../common/shop-ownership.service';

@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopOwnership: ShopOwnershipService,
  ) {}

  async getOverview() {
    const [total, counts, latest] = await Promise.all([
      this.prisma.risk_predictions.count(),
      this.prisma.risk_predictions.groupBy({
        by: ['risk_level'],
        _count: { _all: true },
      }),
      this.prisma.risk_predictions.findFirst({
        orderBy: { predicted_at: 'desc' },
        include: {
          ml_models: true,
          risk_explanations: true,
          recommendations: {
            include: {
              recommendation_actions: {
                orderBy: { created_at: 'desc' },
                take: 1,
              },
            },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          orders: true,
          users: { select: { id: true, full_name: true, email: true } },
        },
      }),
    ]);

    const byLevel = counts.reduce((acc: Record<string, number>, item: any) => {
      acc[item.risk_level] = item._count._all;
      return acc;
    }, {});

    return serialize({
      totalScoredBuyers: total,
      levels: {
        LOW: byLevel.LOW ?? 0,
        MEDIUM: byLevel.MEDIUM ?? 0,
        HIGH: byLevel.HIGH ?? 0,
        CRITICAL: byLevel.CRITICAL ?? 0,
      },
      latest: latest
        ? {
            id: latest.id,
            buyerId: latest.buyer_id,
            buyer: latest.users,
            orderId: latest.order_id,
            riskScore: latest.risk_score,
            riskProbability: latest.risk_probability,
            riskLevel: latest.risk_level,
            predictedAt: latest.predicted_at,
            model: latest.ml_models
              ? {
                  id: latest.ml_models.id,
                  modelName: latest.ml_models.model_name,
                  version: latest.ml_models.version,
                  isActive: latest.ml_models.is_active,
                }
              : null,
            explanations: latest.risk_explanations.map((item) => ({
              id: item.id,
              featureName: item.feature_name,
              featureValue: item.feature_value,
              impactValue: item.impact_value,
              impactDirection: item.impact_direction,
              description: item.description,
            })),
            recommendation: latest.recommendations[0]
              ? {
                  id: latest.recommendations[0].id,
                  title: latest.recommendations[0].title,
                  description: latest.recommendations[0].description,
                  actionType: latest.recommendations[0].action_type,
                  latestAction: latest.recommendations[0].recommendation_actions[0]
                    ? {
                        decision: latest.recommendations[0].recommendation_actions[0].decision,
                        note: latest.recommendations[0].recommendation_actions[0].note,
                        createdAt:
                          latest.recommendations[0].recommendation_actions[0].created_at,
                      }
                    : null,
                }
              : null,
          }
        : null,
    });
  }

  /**
   * Risk assessment theo ORDER (dùng cho Seller Portal).
   *
   * Quy tắc:
   * - SELLER: chỉ được xem risk của order thuộc shop mình sở hữu.
   *   Không có route xem risk profile độc lập của buyer.
   * - BUYER: chỉ được xem risk của đơn hàng của chính mình.
   * - ADMIN: xem tất cả.
   */
  async getRiskForOrder(
    user: { id: string; role: string },
    orderId: bigint,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: { id: true, buyer_id: true, shop_id: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (user.role === 'SELLER') {
      const isOwner = await this.shopOwnership.ownsShop(user.id, order.shop_id);
      if (!isOwner) {
        throw new ForbiddenException('Đơn hàng không thuộc shop của bạn');
      }
    } else if (user.role === 'BUYER') {
      if (order.buyer_id !== user.id) {
        throw new ForbiddenException('Bạn không có quyền xem risk của đơn hàng này');
      }
    }
    // ADMIN: được xem tất cả

    const prediction = await this.prisma.risk_predictions.findFirst({
      where: { order_id: orderId },
      orderBy: { predicted_at: 'desc' },
      include: {
        ml_models: true,
        risk_explanations: true,
        recommendations: {
          include: {
            recommendation_actions: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        users: { select: { id: true, full_name: true, email: true } },
      },
    });

    return serialize({
      order: { id: order.id, buyerId: order.buyer_id, shopId: order.shop_id },
      prediction,
    });
  }

  async getLatest() {
    const latest = await this.prisma.risk_predictions.findFirst({
      orderBy: { predicted_at: 'desc' },
      include: {
        ml_models: true,
        risk_explanations: true,
        recommendations: {
          include: {
            recommendation_actions: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        users: { select: { id: true, full_name: true, email: true } },
      },
    });

    return serialize(latest);
  }

  async getLatestByBuyerId(buyerId: string) {
    const latest = await this.prisma.risk_predictions.findFirst({
      where: { buyer_id: buyerId },
      orderBy: { predicted_at: 'desc' },
      include: {
        ml_models: true,
        risk_explanations: true,
        recommendations: {
          include: {
            recommendation_actions: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        users: { select: { id: true, full_name: true, email: true } },
      },
    });

    return serialize(latest);
  }

  async getRecommendationsLatest() {
    const recommendations = await this.prisma.recommendations.findMany({
      orderBy: { created_at: 'desc' },
      take: 1,
      include: {
        recommendation_actions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            users: { select: { id: true, full_name: true, email: true } },
          },
        },
        risk_predictions: {
          include: {
            users: { select: { id: true, full_name: true, email: true } },
          },
        },
      },
    });

    return serialize(
      recommendations.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        actionType: item.action_type,
        createdAt: item.created_at,
        prediction: item.risk_predictions
          ? {
              id: item.risk_predictions.id,
              buyerId: item.risk_predictions.buyer_id,
              riskLevel: item.risk_predictions.risk_level,
              riskScore: item.risk_predictions.risk_score,
              riskProbability: item.risk_predictions.risk_probability,
              predictedAt: item.risk_predictions.predicted_at,
              buyer: item.risk_predictions.users,
            }
          : null,
        latestAction: item.recommendation_actions[0]
          ? {
              id: item.recommendation_actions[0].id,
              decision: item.recommendation_actions[0].decision,
              note: item.recommendation_actions[0].note,
              createdAt: item.recommendation_actions[0].created_at,
              seller: item.recommendation_actions[0].users,
            }
          : null,
      })),
    );
  }
}
