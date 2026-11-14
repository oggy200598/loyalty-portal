import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProfileDto } from './profile.dto';

const profileSelect = {
  id: true,
  email: true,
  full_name: true,
  phone: true,
  status: true,
  updated_at: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: profileSelect,
    });
    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedException('Tài khoản không hoạt động');
    return {
      id: user.id,
      email: user.email,
      name: user.full_name ?? user.email,
      phone: user.phone,
      updatedAt: user.updated_at,
    };
  }

  async updateProfile(id: string, dto: ProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id=${id}`;
      const before = await tx.users.findUnique({
        where: { id },
        select: profileSelect,
      });
      if (!before || before.status !== 'ACTIVE')
        throw new UnauthorizedException('Tài khoản không hoạt động');
      if (
        before.updated_at.getTime() !==
        new Date(dto.expectedUpdatedAt).getTime()
      )
        throw new ConflictException(
          'Thông tin đã được cập nhật trên thiết bị khác. Hãy tải lại trước khi lưu.',
        );
      const after = await tx.users.update({
        where: { id },
        data: {
          full_name: dto.fullName,
          phone: dto.phone || null,
          updated_at: new Date(
            Math.max(Date.now(), before.updated_at.getTime() + 1),
          ),
        },
        select: profileSelect,
      });
      await tx.audit_logs.create({
        data: {
          user_id: id,
          action: 'PROFILE_UPDATED',
          entity_type: 'USER',
          old_data: JSON.stringify(before),
          new_data: JSON.stringify(after),
        },
      });
      return {
        id: after.id,
        email: after.email,
        name: after.full_name ?? after.email,
        phone: after.phone,
        updatedAt: after.updated_at,
      };
    });
  }

  async findAll() {
    return this.prisma.users.findMany({
      take: 10,
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        status: true,
        created_at: true,
      },
    });
  }
}
