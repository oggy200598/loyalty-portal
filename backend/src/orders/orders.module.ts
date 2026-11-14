import { LoyaltyModule } from '../loyalty/loyalty.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RiskModule } from '../risk/risk.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';
import { CheckoutService } from './checkout.service';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, RiskModule, NotificationsModule, LoyaltyModule],
  controllers: [OrdersController],
  providers: [OrdersService, CheckoutService],
})
export class OrdersModule {}
