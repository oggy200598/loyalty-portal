import { Module } from '@nestjs/common';
import { RiskModule } from '../risk/risk.module';
import { RecommendationsController } from './recommendations.controller';

@Module({
  imports: [RiskModule],
  controllers: [RecommendationsController],
})
export class RecommendationsModule {}
