import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { RiskModule } from '../risk/risk.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [AuthModule, RiskModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
