import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { WindowsMssqlFactory } from './windows-mssql.adapter';
import type { config } from 'mssql';

import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connection = createRequire(__filename)(
      resolve(process.cwd(), 'scripts/sqlserver-connection.cjs'),
    ) as { settings(): { driver: string; config: config } };
    const { driver, config: options } = connection.settings();
    super({
      adapter:
        driver === 'windows'
          ? new WindowsMssqlFactory(options)
          : new PrismaMssql(options),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
