import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ShopOwnershipService } from './shop-ownership.service';

export interface RequestUser {
  id: string;
  role: string;
}

@Injectable()
export class AccessScopeService {
  constructor(private readonly ownership: ShopOwnershipService) {}

  async predictions(
    user: RequestUser,
  ): Promise<Prisma.risk_predictionsWhereInput> {
    if (user.role === 'ADMIN') return {};
    if (user.role === 'BUYER') return { buyer_id: user.id };
    if (user.role === 'SELLER') {
      const shops = await this.ownership.getOwnedShopIds(user.id);
      return { orders: { shop_id: { in: shops } } };
    }
    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
  }
}
