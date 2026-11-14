import { Global, Module } from '@nestjs/common';
import { ShopOwnershipService } from './shop-ownership.service';
import { AccessScopeService } from './access-scope.service';
import { APP_FILTER } from '@nestjs/core';
import { VietnameseHttpExceptionFilter } from './http-errors';

@Global()
@Module({
  providers: [
    ShopOwnershipService,
    AccessScopeService,
    { provide: APP_FILTER, useClass: VietnameseHttpExceptionFilter },
  ],
  exports: [ShopOwnershipService, AccessScopeService],
})
export class CommonModule {}
