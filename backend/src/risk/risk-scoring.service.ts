import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { serialize } from '../common/serialize';
import { BuyerFeaturesService } from './buyer-features.service';

export interface RiskAssessment {
  prediction: {
    buyer_id: string;
    order_id?: string | number | null;
    risk_level: string;
    risk_score: string | number;
    risk_probability: string | number;
  };
  recommendation: unknown;
}

@Injectable()
export class RiskScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: BuyerFeaturesService,
  ) {}

  refreshFeatures(buyerId: string) {
    return this.features.refresh(buyerId);
  }

  async scoreBuyer(buyerId: string, orderId?: bigint) {
    const features = await this.features.refresh(buyerId);
    if (!features)
      throw new NotFoundException('Chưa đủ lịch sử để đánh giá rủi ro');
    const token = process.env.ML_SERVICE_TOKEN;
    if (token && token.length >= 32) {
      try {
        const response = await fetch(
          `${process.env.ML_SERVICE_URL ?? 'http://localhost:8000'}/predict/${buyerId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Token': token,
            },
            body: JSON.stringify({ order_id: orderId?.toString() ?? null }),
            signal: AbortSignal.timeout(3000),
          },
        );
        if (response.ok) {
          const result = (await response.json()) as RiskAssessment;
          if (
            result.prediction?.buyer_id === buyerId &&
            String(result.prediction.order_id ?? '') ===
              String(orderId ?? '') &&
            ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(
              result.prediction.risk_level,
            ) &&
            Number(result.prediction.risk_probability) >= 0 &&
            Number(result.prediction.risk_probability) <= 1
          )
            return result;
        }
      } catch {
        /* The explicitly identified rule model is available below. */
      }
    }
    const model = await this.prisma.ml_models.upsert({
      where: {
        model_name_version: { model_name: 'risk_heuristic', version: '2.0.0' },
      },
      update: {},
      create: {
        model_name: 'risk_heuristic',
        version: '2.0.0',
        algorithm: 'HistoricalBadRateRules',
        is_active: false,
      },
    });
    const velocity = Math.min(
      Math.max((features.orders_last_7_days - 10) / 20, 0),
      1,
    );
    const probability = Math.max(
      0,
      Math.min(
        1,
        0.9 *
          (features.cancel_rate +
            features.return_rate +
            features.failure_rate +
            features.non_receive_rate) +
          0.1 * velocity,
      ),
    );
    const level =
      probability >= 0.8
        ? 'CRITICAL'
        : probability >= 0.5
          ? 'HIGH'
          : probability >= 0.25
            ? 'MEDIUM'
            : 'LOW';
    const score = Math.round(probability * 10000) / 100;
    const risky = level === 'HIGH' || level === 'CRITICAL';
    const prediction = await this.prisma.risk_predictions.create({
      data: {
        buyer_id: buyerId,
        order_id: orderId ?? null,
        model_id: model.id,
        risk_probability: probability,
        risk_score: score,
        risk_level: level,
        risk_explanations: {
          create: [
            'cancel_rate',
            'return_rate',
            'failure_rate',
            'non_receive_rate',
          ].map((name) => ({
            feature_name: name,
            feature_value: features[name] as number,
            impact_value: 0.9 * (features[name] as number),
            impact_direction:
              (features[name] as number) > 0 ? 'POSITIVE' : 'NEUTRAL',
            description:
              'Mức đóng góp vào điểm đánh giá theo quy tắc; chưa phải xác suất dự đoán đã hiệu chỉnh.',
          })),
        },
        ...(risky
          ? {
              recommendations: {
                create: {
                  action_type:
                    level === 'CRITICAL' ? 'BLOCK_BUYER' : 'REQUIRE_PREPAYMENT',
                  title: 'Kiểm tra lịch sử khách hàng trước khi xử lý đơn',
                  description: `Điểm đánh giá theo quy tắc ${score}/100 (${level === 'CRITICAL' ? 'Rất cao' : level === 'HIGH' ? 'Cao' : level === 'MEDIUM' ? 'Trung bình' : 'Thấp'}); chưa phải xác suất dự đoán đã được hiệu chỉnh.`,
                },
              },
            }
          : {}),
      },
      include: {
        risk_explanations: true,
        recommendations: true,
        ml_models: true,
      },
    });
    return serialize({
      prediction,
      recommendation: prediction.recommendations[0] ?? null,
    });
  }
}
