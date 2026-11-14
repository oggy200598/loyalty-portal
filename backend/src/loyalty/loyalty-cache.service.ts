import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient } from 'redis';
import { loyaltyJson } from './loyalty-ledger.service';

/** Redis caches public reward listings only. Balances and approvals always use PostgreSQL. */
@Injectable()
export class LoyaltyCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoyaltyCacheService.name);
  private readonly prefix =
    process.env.LOYALTY_CACHE_PREFIX ?? 'riskmind:loyalty';
  private client?: ReturnType<typeof createClient>;

  async onModuleInit() {
    if (!process.env.REDIS_URL || process.env.NODE_ENV === 'test') return;
    this.client = createClient({
      url: process.env.REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 1000, reconnectStrategy: false },
    });
    this.client.on('error', () =>
      this.logger.warn('Redis cache unavailable; using PostgreSQL'),
    );
    try {
      await this.client.connect();
    } catch {
      this.logger.warn('Loyalty is running without the optional Redis cache');
    }
  }

  onModuleDestroy() {
    if (this.client?.isOpen) this.client.destroy();
  }

  async generation(): Promise<string | null> {
    if (!this.client?.isReady) return null;
    try {
      return (
        (await this.client.get(`${this.prefix}:rewards:generation`)) ?? '0'
      );
    } catch {
      return null;
    }
  }

  async read(version: string): Promise<unknown[] | null> {
    if (!this.client?.isReady) return null;
    try {
      const raw = await this.client.get(`${this.prefix}:rewards:${version}`);
      const result: unknown = raw ? JSON.parse(raw) : null;
      return Array.isArray(result) ? result : null;
    } catch {
      return null;
    }
  }

  async write(version: string, data: unknown) {
    if (!this.client?.isReady) return;
    try {
      await this.client.set(
        `${this.prefix}:rewards:${version}`,
        JSON.stringify(loyaltyJson(data)),
        { EX: 30 },
      );
    } catch {
      /* A cache miss must never fail a business transaction. */
    }
  }

  async invalidate() {
    if (!this.client?.isReady) return;
    try {
      await this.client.incr(`${this.prefix}:rewards:generation`);
    } catch {
      /* Every cached generation also has a short TTL. */
    }
  }
}
