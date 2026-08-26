import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { serialize } from '../../common/serialize';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seller/Admin ghi nhận quyết định xử lý một recommendation */
  async createAction(
    recommendationId: bigint,
    sellerId: string,
    decision: string,
    note?: string,
  ) {
    const recommendation = await this.prisma.recommendations.findUnique({
      where: { id: recommendationId },
      include: { risk_predictions: true },
    });
    if (!recommendation) throw new NotFoundException('Không tìm thấy recommendation');

    // Seller chỉ được xử lý recommendation liên quan đến shop của mình
    if (recommendation.risk_predictions?.order_id) {
      const order = await this.prisma.orders.findUnique({
        where: { id: recommendation.risk_predictions.order_id },
        select: { shop_id: true },
      });
      if (order) {
        const isOwner = await this.prisma.shops.findFirst({
          where: { id: order.shop_id, owner_id: sellerId },
        });
        const isAdmin = await this.prisma.user_roles.findFirst({
          where: {
            user_id: sellerId,
            roles: { name: 'ADMIN' },
          },
        });
        if (!isOwner && !isAdmin) {
          throw new ForbiddenException('Bạn không có quyền xử lý recommendation này');
        }
      }
    }

    const action = await this.prisma.recommendation_actions.create({
      data: {
        recommendation_id: recommendationId,
        seller_id: sellerId,
        decision: decision as never,
        note,
      },
      include: {
        users: { select: { id: true, full_name: true, email: true } },
      },
    });

    return serialize(action);
  }

  /** Danh sách recommendations kèm actions (cho seller dashboard) */
  async list(limit = 20) {
    const items = await this.prisma.recommendations.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        recommendation_actions: {
          include: {
            users: { select: { id: true, full_name: true, email: true } },
          },
          orderBy: { created_at: 'desc' },
        },
        risk_predictions: {
          include: {
            users: { select: { id: true, full_name: true, email: true } },
          },
        },
      },
    });

    return serialize(
      items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        actionType: item.action_type,
        createdAt: item.created_at,
        prediction: item.risk_predictions
          ? {
              id: item.risk_predictions.id,
              buyerId: item.risk_predictions.buyer_id,
              buyer: item.risk_predictions.users,
              riskLevel: item.risk_predictions.risk_level,
              riskScore: item.risk_predictions.risk_score,
              predictedAt: item.risk_predictions.predicted_at,
            }
          : null,
        actions: item.recommendation_actions.map((a) => ({
          id: a.id,
          decision: a.decision,
          note: a.note,
          createdAt: a.created_at,
          seller: a.users,
        })),
      })),
    );
  }
}
