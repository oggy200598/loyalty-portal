import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class AccountRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountRecoveryService.name);
  private readonly limits = new Map<string, { count: number; until: number }>();
  private timer?: ReturnType<typeof setInterval>;
  private delivering = false;
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.MAIL_WORKER_ENABLED === 'false'
    )
      return;
    this.timer = setInterval(() => {
      void this.deliverPending().catch(() =>
        this.logger.error('Recovery mail worker failed.'),
      );
    }, 5000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private limit(key: string, max: number) {
    const now = Date.now();
    for (const [name, value] of this.limits)
      if (value.until < now) this.limits.delete(name);
    const entry = this.limits.get(key) ?? { count: 0, until: now + 15 * 60000 };
    if (
      entry.count >= max ||
      (!this.limits.has(key) && this.limits.size >= 10000)
    )
      throw new HttpException(
        'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        429,
      );
    entry.count++;
    this.limits.set(key, entry);
  }
  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
  private key() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32)
      throw new ServiceUnavailableException(
        'Thiếu cấu hình bảo vệ thư khôi phục.',
      );
    return createHash('sha256').update(`recovery-mail:${secret}`).digest();
  }
  private encrypt(payload: object) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const data = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
  }
  private decrypt(payload: string): {
    to: string;
    resetUrl: string;
    token: string;
  } {
    const bytes = Buffer.from(payload, 'base64'),
      cipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        bytes.subarray(0, 12),
      );
    cipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        cipher.update(bytes.subarray(28)),
        cipher.final(),
      ]).toString('utf8'),
    ) as { to: string; resetUrl: string; token: string };
  }
  private transport() {
    const kind =
      process.env.MAIL_TRANSPORT ??
      (process.env.NODE_ENV === 'production' ? 'disabled' : 'file');
    if (kind === 'file' && process.env.NODE_ENV !== 'production') return kind;
    if (
      kind === 'resend' &&
      process.env.RESEND_API_KEY &&
      process.env.MAIL_FROM
    )
      return kind;
    throw new ServiceUnavailableException(
      'Email khôi phục chưa được cấu hình.',
    );
  }
  async request(email: string, ip: string) {
    this.limit(`ip:${ip}`, 20);
    email = email.trim().toLowerCase();
    this.limit(`email:${this.hash(email)}`, 3);
    const transport = this.transport();
    const base = new URL(process.env.WEB_PUBLIC_URL ?? 'http://localhost:5173');
    if (
      !['https:', 'http:'].includes(base.protocol) ||
      base.username ||
      base.password ||
      (process.env.NODE_ENV === 'production' && base.protocol !== 'https:')
    )
      throw new ServiceUnavailableException(
        'URL khôi phục chưa được cấu hình đúng.',
      );
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    if (user?.status === 'ACTIVE') {
      const token = randomBytes(32).toString('hex'),
        id = randomUUID();
      // Fragment không được gửi vào access log của web server.
      const resetUrl = new URL('/reset-password', base);
      resetUrl.hash = token;
      const payload = this.encrypt({
        to: email,
        token,
        resetUrl: resetUrl.toString(),
      });
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=${user.id}`;
        const recent = await tx.password_reset_tokens.count({
          where: {
            user_id: user.id,
            created_at: { gte: new Date(Date.now() - 15 * 60000) },
          },
        });
        if (recent >= 3) return;
        await tx.password_reset_tokens.updateMany({
          where: { user_id: user.id, used_at: null },
          data: {
            used_at: new Date(),
            mail_state: 'CANCELLED',
            mail_payload: null,
          },
        });
        await tx.password_reset_tokens.create({
          data: {
            id,
            user_id: user.id,
            token_hash: this.hash(token),
            expires_at: new Date(Date.now() + 15 * 60000),
            mail_payload: payload,
          },
        });
      });
    }
    return {
      message:
        transport === 'file'
          ? 'Yêu cầu đã được tiếp nhận. Chế độ local lưu thư khôi phục tại backend/.local/mail-outbox; không gửi email thật.'
          : 'Yêu cầu đã được tiếp nhận. Nếu tài khoản phù hợp, bạn sẽ nhận được hướng dẫn qua email.',
    };
  }
  private validatePassword(password: string) {
    if (['buyer123', 'seller123', 'admin123'].includes(password))
      throw new BadRequestException(
        'Hãy chọn mật khẩu mới khác các mật khẩu mẫu cũ.',
      );
    if (Buffer.byteLength(password, 'utf8') > 72)
      throw new BadRequestException(
        'Mật khẩu không được vượt quá 72 byte UTF-8.',
      );
  }
  private async replace(
    tx: Prisma.TransactionClient,
    userId: string,
    passwordHash: string,
    action: string,
  ) {
    const now = new Date();
    await tx.users.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        auth_version: { increment: 1 },
        updated_at: now,
      },
    });
    await tx.password_reset_tokens.updateMany({
      where: { user_id: userId, used_at: null },
      data: { used_at: now, mail_payload: null, mail_state: 'CANCELLED' },
    });
    await tx.audit_logs.create({
      data: {
        user_id: userId,
        action,
        entity_type: 'USER',
        new_data: JSON.stringify({ sessionsRevoked: true }),
      },
    });
  }
  async reset(token: string, password: string, ip: string) {
    this.limit(`reset:${ip}`, 20);
    this.validatePassword(password);
    const row = await this.prisma.password_reset_tokens.findUnique({
      where: { token_hash: this.hash(token) },
    });
    if (!row)
      throw new BadRequestException('Liên kết không hợp lệ hoặc đã hết hạn.');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=${row.user_id}`;
      const current = await tx.password_reset_tokens.findUnique({
        where: { id: row.id },
      });
      const user = await tx.users.findUnique({ where: { id: row.user_id } });
      if (
        !current ||
        current.used_at ||
        current.expires_at <= new Date() ||
        user?.status !== 'ACTIVE'
      )
        throw new BadRequestException('Liên kết không hợp lệ hoặc đã hết hạn.');
      await this.replace(tx, row.user_id, passwordHash, 'PASSWORD_RESET');
    });
    return {
      message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.',
    };
  }
  async change(userId: string, currentPassword: string, password: string) {
    this.limit(`change:${userId}`, 5);
    this.validatePassword(password);
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=${userId}`;
      const user = await tx.users.findUnique({ where: { id: userId } });
      if (!user || user.status !== 'ACTIVE')
        throw new UnauthorizedException('Tài khoản không hoạt động.');
      if (!(await bcrypt.compare(currentPassword, user.password_hash)))
        throw new BadRequestException('Mật khẩu hiện tại không đúng.');
      if (await bcrypt.compare(password, user.password_hash))
        throw new BadRequestException(
          'Mật khẩu mới phải khác mật khẩu hiện tại.',
        );
      await this.replace(tx, userId, passwordHash, 'PASSWORD_CHANGED');
    });
    return {
      message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.',
    };
  }
  async deliverPending() {
    if (this.delivering) return;
    this.delivering = true;
    try {
      const now = new Date(),
        stale = new Date(Date.now() - 60000);
      await this.prisma.password_reset_tokens.updateMany({
        where: {
          mail_state: 'SENDING',
          mail_lease_at: { lt: stale },
          mail_attempts: { lt: 3 },
        },
        data: { mail_state: 'PENDING' },
      });
      await this.prisma.password_reset_tokens.updateMany({
        where: {
          mail_payload: { not: null },
          OR: [
            { expires_at: { lte: now } },
            {
              mail_attempts: { gte: 3 },
              mail_state: 'SENDING',
              mail_lease_at: { lt: stale },
            },
          ],
        },
        data: { mail_payload: null, mail_state: 'CANCELLED' },
      });
      await this.prisma.password_reset_tokens.deleteMany({
        where: { expires_at: { lt: new Date(Date.now() - 7 * 86400000) } },
      });
      const rows = await this.prisma.password_reset_tokens.findMany({
        where: {
          used_at: null,
          expires_at: { gt: now },
          mail_state: 'PENDING',
          mail_next_at: { lte: now },
          mail_attempts: { lt: 3 },
        },
        take: 10,
        orderBy: { created_at: 'asc' },
      });
      for (const row of rows) {
        const claimed = await this.prisma.password_reset_tokens.updateMany({
          where: {
            id: row.id,
            mail_state: 'PENDING',
            used_at: null,
            expires_at: { gt: new Date() },
          },
          data: {
            mail_state: 'SENDING',
            mail_lease_at: new Date(),
            mail_attempts: { increment: 1 },
          },
        });
        if (!claimed.count) continue;
        try {
          const mail = this.decrypt(row.mail_payload!);
          if (this.transport() === 'file') {
            const dir = resolve(
              process.env.PASSWORD_RESET_OUTBOX_DIR ?? '.local/mail-outbox',
            );
            await mkdir(dir, { recursive: true, mode: 0o700 });
            await writeFile(
              resolve(dir, `${row.id}.json`),
              JSON.stringify(
                {
                  to: mail.to,
                  resetUrl: mail.resetUrl,
                  token: mail.token,
                  expiresAt: row.expires_at,
                },
                null,
                2,
              ),
              { mode: 0o600 },
            );
          } else {
            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': row.id,
              },
              body: JSON.stringify({
                from: process.env.MAIL_FROM,
                to: [mail.to],
                subject: 'Đặt lại mật khẩu RiskMind',
                text: `Liên kết có hiệu lực 15 phút, dùng một lần:\n${mail.resetUrl}\n\nMã khôi phục để nhập trên mobile:\n${mail.token}`,
              }),
              signal: AbortSignal.timeout(15000),
            });
            if (!response.ok)
              throw new Error('Dịch vụ gửi thư từ chối yêu cầu.');
            const receipt: unknown = await response.json();
            if (
              !receipt ||
              typeof receipt !== 'object' ||
              !('id' in receipt) ||
              typeof receipt.id !== 'string' ||
              !receipt.id
            )
              throw new Error('Xác nhận gửi thư không hợp lệ.');
          }
          await this.prisma.password_reset_tokens.updateMany({
            where: { id: row.id, mail_state: 'SENDING' },
            data: { mail_state: 'SENT', mail_payload: null },
          });
        } catch {
          await this.prisma.password_reset_tokens.updateMany({
            where: { id: row.id, mail_state: 'SENDING' },
            data: {
              mail_state: row.mail_attempts >= 2 ? 'FAILED' : 'PENDING',
              mail_payload: row.mail_attempts >= 2 ? null : row.mail_payload,
              mail_next_at: new Date(Date.now() + 60000),
            },
          });
          this.logger.error(
            'Recovery email delivery failed; see mail_state/mail_attempts for retry status.',
          );
        }
      }
    } finally {
      this.delivering = false;
    }
  }
}
