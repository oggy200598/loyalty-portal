import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PaymentsController } from './payments.controller';
import { VnpayService } from './vnpay.service';
import { MomoController } from './momo.controller';
import { MomoGateway } from './momo.gateway';
import { MomoService } from './momo.service';
@Module({
  imports: [AuthModule, LoyaltyModule],
  controllers: [PaymentsController, MomoController],
  providers: [VnpayService, MomoService, MomoGateway],
})
export class PaymentsModule {}
