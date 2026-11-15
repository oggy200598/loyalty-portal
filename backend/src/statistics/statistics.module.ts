import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { SellerStatsService } from './seller-stats.service';

@Module({
  imports: [AuthModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, SellerStatsService],
})
export class StatisticsModule {}
