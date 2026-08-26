import { Global, Module } from '@nestjs/common';
import { ShopOwnershipService } from './shop-ownership.service';

@Global()
@Module({
  providers: [ShopOwnershipService],
  exports: [ShopOwnershipService],
})
export class CommonModule {}
