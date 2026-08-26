import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './auth.constants';

export type RoleName = 'BUYER' | 'SELLER' | 'ADMIN';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
