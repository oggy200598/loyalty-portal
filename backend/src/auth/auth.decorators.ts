import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { RequestUser } from '../common/access-scope.service';

export const AUTH_USER_KEY = 'auth_user';

export const ROLES_KEY = 'roles';

export type RoleName = 'BUYER' | 'SELLER' | 'ADMIN';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<{ user: RequestUser }>().user,
);
