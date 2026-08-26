import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { RiskModule } from './modules/risk/risk.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CartModule } from './modules/cart/cart.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { CouponsModule } from './modules/coupons/coupons.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    StatisticsModule,
    RiskModule,
    RecommendationsModule,
    OrdersModule,
    CartModule,
    ReviewsModule,
    NotificationsModule,
    CouponsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
