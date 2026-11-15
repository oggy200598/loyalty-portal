import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { BuyerFeaturesService } from './buyer-features.service';
import { RiskScoringService } from './risk-scoring.service';

@Module({
  imports: [AuthModule],
  controllers: [RiskController],
  providers: [RiskService, RiskScoringService, BuyerFeaturesService],
  exports: [RiskService, RiskScoringService],
})
export class RiskModule {}
