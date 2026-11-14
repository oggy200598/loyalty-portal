import { LoyaltyCacheService } from './loyalty-cache.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AdminLoyaltyController,
  LoyaltyController,
} from './loyalty.controller';
import { LoyaltyLedgerService } from './loyalty-ledger.service';
import { LoyaltyOrdersService } from './loyalty-orders.service';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyWorker } from './loyalty.worker';

@Module({
  imports: [AuthModule],
  controllers: [LoyaltyController, AdminLoyaltyController],
  providers: [
    LoyaltyCacheService,
    LoyaltyLedgerService,
    LoyaltyOrdersService,
    LoyaltyService,
    LoyaltyWorker,
  ],
  exports: [LoyaltyOrdersService],
})
export class LoyaltyModule {}
