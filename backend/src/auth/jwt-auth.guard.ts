import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AUTH_USER_KEY } from './auth.constants';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { [AUTH_USER_KEY]?: unknown; user?: unknown }>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục.');
    }

    const token = header.slice(7);

    try {
      const payload = await this.jwtService.verifyAsync<{
        id?: unknown;
        sessionVersion?: unknown;
      }>(token);
      if (typeof payload.id !== 'string') throw new UnauthorizedException();
      const version = payload.sessionVersion ?? 0;
      if (
        typeof version !== 'number' ||
        !Number.isInteger(version) ||
        version < 0
      )
        throw new UnauthorizedException();
      const user = await this.authService.me(payload.id, version);
      const sessionUser = { ...user, sessionVersion: version };
      request[AUTH_USER_KEY] = sessionUser;
      (request as Request & { user?: unknown }).user = sessionUser;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      );
    }
  }
}
