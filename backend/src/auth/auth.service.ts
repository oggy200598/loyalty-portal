import { ConflictException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma/prisma.service';
import { RoleName } from './roles.decorator';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: RoleName;
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDemoUsers();
  }

  async ensureDemoUsers(): Promise<void> {
    const roles = await this.ensureRoles();
    await this.upsertDemoUser('buyer@riskmind.ai', 'Buyer Demo', 'buyer123', roles.BUYER);
    await this.upsertDemoUser('seller@riskmind.ai', 'Seller Demo', 'seller123', roles.SELLER);
    await this.upsertDemoUser('admin@riskmind.ai', 'Admin Demo', 'admin123', roles.ADMIN);
  }

  async register(payload: { name: string; email: string; password: string; role?: RoleName }): Promise<{ accessToken: string; user: AuthUser }> {
    const email = payload.email.trim().toLowerCase();
    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already exists');

    const role = payload.role ?? 'BUYER';
    const roleRow = await this.getRoleRow(role);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.users.create({
      data: {
        email,
        full_name: payload.name,
        password_hash: passwordHash,
        user_roles: {
          create: [{ role_id: roleRow.id }],
        },
      },
      include: {
        user_roles: { include: { roles: true } },
      },
    });

    return this.issue(user);
  }

  async login(payload: { email: string; password: string }): Promise<{ accessToken: string; user: AuthUser }> {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { user_roles: { include: { roles: true } } },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(payload.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issue(user);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { user_roles: { include: { roles: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toAuthUser(user);
  }

  async forgotPassword(_email: string): Promise<{ message: string }> {
    return { message: 'Password reset flow is not enabled in this demo build.' };
  }

  private async issue(user: any) {
    const authUser = this.toAuthUser(user);
    const accessToken = await this.jwtService.signAsync(authUser);
    return { accessToken, user: authUser };
  }

  private toAuthUser(user: any): AuthUser {
    const firstRole = user.user_roles?.[0]?.roles?.name as RoleName | undefined;
    return {
      id: user.id,
      name: user.full_name ?? user.email,
      email: user.email,
      role: firstRole ?? 'BUYER',
    };
  }

  private async ensureRoles() {
    const roles = ['BUYER', 'SELLER', 'ADMIN'] as const;
    const rows: Record<string, { id: bigint; name: string }> = {};
    for (const name of roles) {
      rows[name] = await this.prisma.roles.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    return rows as Record<RoleName, { id: bigint; name: string }>;
  }

  private async getRoleRow(role: RoleName) {
    return this.prisma.roles.findUniqueOrThrow({ where: { name: role } });
  }

  private async upsertDemoUser(email: string, fullName: string, password: string, role: { id: bigint }) {
    const existing = await this.prisma.users.findUnique({
      where: { email },
      include: { user_roles: true },
    });
    const passwordHash = await bcrypt.hash(password, 10);
    if (!existing) {
      await this.prisma.users.create({
        data: {
          email,
          full_name: fullName,
          password_hash: passwordHash,
          user_roles: { create: [{ role_id: role.id }] },
        },
      });
      return;
    }

    await this.prisma.users.update({
      where: { email },
      data: {
        full_name: fullName,
        password_hash: passwordHash,
        user_roles: {
          deleteMany: {},
          create: [{ role_id: role.id }],
        },
      },
    });
  }
}
