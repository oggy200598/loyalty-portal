import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { exhaustMap, take, timer } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { serialize } from '../common/serialize';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  stream(userId: string, sessionVersion?: number) {
    // Đọc DB để nhận cả thông báo được ghi trực tiếp trong transaction và từ instance khác.
    // Kết thúc sau một phút; client nối lại qua JWT guard để kiểm tra hạn token.
    return timer(0, 3000).pipe(
      take(20),
      exhaustMap(async () => ({
        type: 'notifications',
        data: await this.snapshot(userId, sessionVersion),
      })),
    );
  }
  async snapshot(userId: string, sessionVersion?: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { status: true, auth_version: true },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
    if (sessionVersion != null && user.auth_version !== sessionVersion)
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi.');
    const where = { user_id: userId };
    const [total, unreadCount, last] = await Promise.all([
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({ where: { ...where, is_read: false } }),
      this.prisma.notifications.findFirst({
        where,
        orderBy: { id: 'desc' },
        select: { id: true },
      }),
    ]);
    return { total, unreadCount, latestId: last?.id.toString() ?? null };
  }

  async list(userId: string, page = 1, limit = 20) {
    const where = { user_id: userId };
    const [total, unreadCount, data] = await Promise.all([
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({ where: { ...where, is_read: false } }),
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return serialize({
      data,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notifications.findUnique({
      where: { id: BigInt(id) },
    });
    if (!notification || notification.user_id !== userId) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    await this.prisma.notifications.update({
      where: { id: notification.id },
      data: { is_read: true },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
    return { success: true };
  }

  /** Helper nội bộ: tạo notification (dùng khi đổi trạng thái đơn/risk alert) */
  async notify(
    userId: string,
    title: string,
    message: string,
    type: 'ORDER_UPDATE' | 'RISK_ALERT' | 'PROMOTION' | 'SYSTEM',
    referenceType?: string,
    referenceId?: bigint,
  ) {
    await this.prisma.notifications.create({
      data: {
        user_id: userId,
        title,
        message,
        type,
        reference_type: referenceType,
        reference_id: referenceId,
      },
    });
  }
}
