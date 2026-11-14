import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { LoyaltyOrdersService } from './loyalty-orders.service';
import { LoyaltyService } from './loyalty.service';

/** Database locks and unique ledger keys allow multiple application instances. */
@Injectable()
export class LoyaltyWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoyaltyWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly orders: LoyaltyOrdersService,
  ) {}
  onModuleInit() {
    if (
      process.env.LOYALTY_WORKER_ENABLED === 'false' ||
      process.env.NODE_ENV === 'test'
    )
      return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.loyalty.expireDue();
      await this.orders.reconcile();
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : 'Loyalty worker failed',
      );
    } finally {
      this.running = false;
    }
  }
}
