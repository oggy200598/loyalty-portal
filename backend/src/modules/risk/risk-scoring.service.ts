import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { serialize } from '../../common/serialize';

/**
 * Heuristic risk scoring (thay thế model ML thật khi chưa có pipeline Python).
 * Trọng số dựa trên các feature trong buyer_features / buyer_profiles.
 */
const WEIGHTS = {
  cancelRate: 0.3,
  returnRate: 0.25,
  failureRate: 0.2,
  nonReceiveRate: 0.15,
  highOrderVelocity: 0.1, // quá nhiều đơn trong 7 ngày
};

function levelFromProbability(p: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (p >= 0.8) return 'CRITICAL';
  if (p >= 0.5) return 'HIGH';
  if (p >= 0.25) return 'MEDIUM';
  return 'LOW';
}

@Injectable()
export class RiskScoringService {
  private readonly mlServiceUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chấm điểm: ưu tiên gọi ML service Python; nếu lỗi/không khả dụng
   * thì fallback về heuristic nội bộ.
   */
  async scoreBuyer(buyerId: string, orderId?: bigint) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.mlServiceUrl}/predict/${buyerId}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        // ML service đã ghi prediction + explanations + recommendation vào DB
        return await res.json();
      }
    } catch {
      // ML service không khả dụng → fallback heuristic bên dưới
    }

    return this.heuristicScore(buyerId, orderId);
  }

  /** Heuristic fallback khi chưa có model ML thật. */
  private async heuristicScore(buyerId: string, orderId?: bigint) {
    const model = await this.prisma.ml_models.findFirst({
      where: { is_active: true },
    });
    if (!model) {
      throw new NotFoundException('Chưa có mô hình ML active trong hệ thống');
    }

    // Lấy feature mới nhất của buyer
    const features = await this.prisma.buyer_features.findFirst({
      where: { buyer_id: buyerId },
      orderBy: { feature_date: 'desc' },
    });

    const num = (v: unknown) => Number(v ?? 0);
    const cancelRate = num(features?.cancel_rate);
    const returnRate = num(features?.return_rate);
    const failureRate = num(features?.failure_rate);
    const nonReceiveRate = num(features?.non_receive_rate);
    const orders7d = features?.orders_last_7_days ?? 0;
    const velocityPenalty = orders7d > 10 ? Math.min((orders7d - 10) / 20, 1) : 0;

    const probability =
      cancelRate * WEIGHTS.cancelRate +
      returnRate * WEIGHTS.returnRate +
      failureRate * WEIGHTS.failureRate +
      nonReceiveRate * WEIGHTS.nonReceiveRate +
      velocityPenalty * WEIGHTS.highOrderVelocity;

    const clamped = Math.max(0, Math.min(1, probability));
    const level = levelFromProbability(clamped);
    const score = Math.round(clamped * 100 * 100) / 100; // 0-100

    const prediction = await this.prisma.risk_predictions.create({
      data: {
        buyer_id: buyerId,
        order_id: orderId ?? null,
        model_id: model.id,
        risk_probability: clamped,
        risk_score: score,
        risk_level: level,
        risk_explanations: {
          create: [
            {
              feature_name: 'cancel_rate',
              feature_value: cancelRate,
              impact_value: cancelRate * WEIGHTS.cancelRate,
              impact_direction:
                cancelRate > 0.2 ? 'POSITIVE' : cancelRate > 0 ? 'NEUTRAL' : 'NEGATIVE',
              description: `Tỷ lệ hủy đơn của buyer: ${(cancelRate * 100).toFixed(1)}%`,
            },
            {
              feature_name: 'return_rate',
              feature_value: returnRate,
              impact_value: returnRate * WEIGHTS.returnRate,
              impact_direction:
                returnRate > 0.2 ? 'POSITIVE' : returnRate > 0 ? 'NEUTRAL' : 'NEGATIVE',
              description: `Tỷ lệ hoàn trả: ${(returnRate * 100).toFixed(1)}%`,
            },
            {
              feature_name: 'failure_rate',
              feature_value: failureRate,
              impact_value: failureRate * WEIGHTS.failureRate,
              impact_direction:
                failureRate > 0.15 ? 'POSITIVE' : failureRate > 0 ? 'NEUTRAL' : 'NEGATIVE',
              description: `Tỷ lệ đơn thất bại: ${(failureRate * 100).toFixed(1)}%`,
            },
            {
              feature_name: 'non_receive_rate',
              feature_value: nonReceiveRate,
              impact_value: nonReceiveRate * WEIGHTS.nonReceiveRate,
              impact_direction:
                nonReceiveRate > 0.15 ? 'POSITIVE' : nonReceiveRate > 0 ? 'NEUTRAL' : 'NEGATIVE',
              description: `Tỷ lệ không nhận hàng: ${(nonReceiveRate * 100).toFixed(1)}%`,
            },
            {
              feature_name: 'orders_last_7_days',
              feature_value: orders7d,
              impact_value: velocityPenalty * WEIGHTS.highOrderVelocity,
              impact_direction: velocityPenalty > 0.5 ? 'POSITIVE' : 'NEUTRAL',
              description: `Số đơn trong 7 ngày qua: ${orders7d}`,
            },
          ],
        },
      },
      include: { risk_explanations: true, ml_models: true },
    });

    // Tạo recommendation tự động nếu rủi ro cao
    let recommendation: unknown = null;
    if (level === 'HIGH' || level === 'CRITICAL') {
      recommendation = await this.prisma.recommendations.create({
        data: {
          prediction_id: prediction.id,
          action_type: level === 'CRITICAL' ? 'BLOCK_BUYER' : 'REQUIRE_PREPAYMENT',
          title:
            level === 'CRITICAL'
              ? 'Cân nhắc chặn buyer do rủi ro cực cao'
              : 'Yêu cầu thanh toán trước cho đơn này',
          description: `Điểm rủi ro ${score}/100 (${level}). Đề xuất kiểm tra lịch sử mua hàng trước khi xử lý.`,
        },
      });
    }

    return serialize({ prediction, recommendation });
  }
}
