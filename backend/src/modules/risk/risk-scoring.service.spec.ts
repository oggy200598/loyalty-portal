import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RiskScoringService } from './risk-scoring.service';
import { PrismaService } from '../../database/prisma/prisma.service';

describe('RiskScoringService (heuristic)', () => {
  let service: RiskScoringService;
  let prisma: {
    ml_models: { findFirst: jest.Mock };
    buyer_features: { findFirst: jest.Mock };
    risk_predictions: { create: jest.Mock };
    recommendations: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      ml_models: { findFirst: jest.fn() },
      buyer_features: { findFirst: jest.fn() },
      risk_predictions: { create: jest.fn() },
      recommendations: { create: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RiskScoringService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(RiskScoringService);
    // Vô hiệu hóa ML service URL để luôn dùng heuristic trong test
    process.env.ML_SERVICE_URL = 'http://localhost:1';
  });

  it('404 khi không có model active', async () => {
    prisma.ml_models.findFirst.mockResolvedValue(null);

    await expect(service.scoreBuyer('buyer-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('risk LOW khi buyer sạch', async () => {
    prisma.ml_models.findFirst.mockResolvedValue({ id: BigInt(1) });
    prisma.buyer_features.findFirst.mockResolvedValue({
      cancel_rate: '0',
      return_rate: '0',
      failure_rate: '0',
      non_receive_rate: '0',
      orders_last_7_days: 2,
    });
    prisma.risk_predictions.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: BigInt(1), ...data }),
    );

    const result = await service.scoreBuyer('buyer-1');

    expect(result.prediction.risk_level).toBe('LOW');
    expect(Number(result.prediction.risk_probability)).toBeLessThan(0.25);
    expect(result.recommendation).toBeNull();
  });

  it('risk CRITICAL + tạo recommendation BLOCK_BUYER khi rates cao', async () => {
    prisma.ml_models.findFirst.mockResolvedValue({ id: BigInt(1) });
    prisma.buyer_features.findFirst.mockResolvedValue({
      cancel_rate: '0.9',
      return_rate: '0.9',
      failure_rate: '0.8',
      non_receive_rate: '0.9',
      orders_last_7_days: 20,
    });
    prisma.risk_predictions.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: BigInt(2), ...data }),
    );
    prisma.recommendations.create.mockResolvedValue({ id: BigInt(3) });

    const result = await service.scoreBuyer('buyer-2');

    expect(result.prediction.risk_level).toBe('CRITICAL');
    expect(result.recommendation).toBeDefined();
    expect(prisma.recommendations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action_type: 'BLOCK_BUYER' }),
      }),
    );
  });

  it('tạo explanations cho từng feature', async () => {
    prisma.ml_models.findFirst.mockResolvedValue({ id: BigInt(1) });
    prisma.buyer_features.findFirst.mockResolvedValue({
      cancel_rate: '0.5',
      return_rate: '0',
      failure_rate: '0',
      non_receive_rate: '0',
      orders_last_7_days: 0,
    });
    prisma.risk_predictions.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: BigInt(4), ...data }),
    );

    const result = await service.scoreBuyer('buyer-3');
    const names = result.prediction.risk_explanations.create.map(
      (e: { feature_name: string }) => e.feature_name,
    );

    expect(names).toContain('cancel_rate');
    expect(names).toContain('return_rate');
    expect(names).toContain('orders_last_7_days');
  });
});
