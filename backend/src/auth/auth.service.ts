import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { RoleName } from './roles.decorator';
import { enrollMember } from '../loyalty/enroll-member';

type DatabaseAuthUser = Prisma.usersGetPayload<{
  include: { user_roles: { include: { roles: true } } };
}>;

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: RoleName;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: {
    name: string;
    email: string;
    password: string;
    role?: RoleName;
    phone?: string;
  }): Promise<{ accessToken: string; user: AuthUser }> {
    const email = payload.email.trim().toLowerCase();
    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email đã được sử dụng.');

    if (payload.role && payload.role !== 'BUYER') {
      throw new BadRequestException(
        'Đăng ký công khai chỉ dành cho khách hàng.',
      );
    }
    const roleRow = await this.prisma.roles.upsert({
      where: { name: 'BUYER' },
      update: {},
      create: { name: 'BUYER' },
    });
    if (Buffer.byteLength(payload.password, 'utf8') > 72)
      throw new BadRequestException(
        'Mật khẩu không được vượt quá 72 byte UTF-8.',
      );
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const account = await tx.users.create({
        data: {
          email,
          full_name: payload.name.trim(),
          phone: payload.phone?.trim(),
          password_hash: passwordHash,
          user_roles: {
            create: [{ role_id: roleRow.id }],
          },
        },
        include: {
          user_roles: { include: { roles: true } },
        },
      });
      await enrollMember(tx, account.id);
      return account;
    });

    return this.issue(user);
  }

  async login(payload: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; user: AuthUser }> {
    if (Buffer.byteLength(payload.password, 'utf8') > 72)
      throw new UnauthorizedException(
        'Tên tài khoản hoặc mật khẩu không đúng.',
      );
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { user_roles: { include: { roles: true } } },
    });

    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedException(
        'Tên tài khoản hoặc mật khẩu không đúng.',
      );

    const legacy: Record<string, string> = {
      'buyer@riskmind.ai': 'buyer123',
      'seller@riskmind.ai': 'seller123',
      'admin@riskmind.ai': 'admin123',
    };
    if (legacy[email] === payload.password)
      throw new UnauthorizedException(
        'Tên tài khoản hoặc mật khẩu không đúng.',
      );
    const ok = await bcrypt.compare(payload.password, user.password_hash);
    if (!ok)
      throw new UnauthorizedException(
        'Tên tài khoản hoặc mật khẩu không đúng.',
      );

    return this.issue(user);
  }

  async me(userId: string, expectedVersion?: number): Promise<AuthUser> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { user_roles: { include: { roles: true } } },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (expectedVersion != null && (user.auth_version ?? 0) !== expectedVersion)
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi.');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Tài khoản không hoạt động.');
    return this.toAuthUser(user);
  }

  private async issue(user: DatabaseAuthUser) {
    const authUser = this.toAuthUser(user);
    const accessToken = await this.jwtService.signAsync({
      ...authUser,
      sessionVersion: user.auth_version ?? 0,
    });
    return { accessToken, user: authUser };
  }

  private toAuthUser(user: DatabaseAuthUser): AuthUser {
    const assigned =
      user.user_roles?.map(
        (entry: { roles: { name: string } }) => entry.roles.name,
      ) ?? [];
    const firstRole = (['ADMIN', 'SELLER', 'BUYER'] as const).find((role) =>
      assigned.includes(role),
    );
    if (!firstRole)
      throw new UnauthorizedException('Tài khoản chưa được phân quyền.');
    return {
      id: user.id,
      name: user.full_name ?? user.email,
      email: user.email,
      role: firstRole ?? 'BUYER',
    };
  }
}
