import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AccessScopeService,
  type RequestUser,
} from '../common/access-scope.service';
import { serialize } from '../common/serialize';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: AccessScopeService,
  ) {}

  /** Seller/Admin ghi nhận quyết định xử lý một recommendation */
  async createAction(
    recommendationId: bigint,
    user: RequestUser,
    decision: string,
    note?: string,
  ) {
    const where = await this.scope.predictions(user);
    const recommendation = await this.prisma.recommendations.findFirst({
      where: { id: recommendationId, risk_predictions: where },
      include: { risk_predictions: true },
    });
    if (!recommendation) throw new NotFoundException('Không tìm thấy đề xuất.');

    const action = await this.prisma.recommendation_actions.create({
      data: {
        recommendation_id: recommendationId,
        seller_id: user.id,
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
  async list(user: RequestUser, limit = 20) {
    const where = await this.scope.predictions(user);
    const items = await this.prisma.recommendations.findMany({
      where: { risk_predictions: where },
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
