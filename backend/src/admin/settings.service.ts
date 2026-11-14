import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SettingsDto } from './settings.dto';
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}
  async get() {
    const row = await this.prisma.system_settings.findUniqueOrThrow({
      where: { id: 1 },
    });
    return {
      storeName: row.store_name,
      supportEmail: row.support_email,
      supportPhone: row.support_phone,
      storeAddress: row.store_address,
      shippingFee: Number(row.shipping_fee),
      freeShippingThreshold: Number(row.free_shipping_threshold),
      version: row.version,
      updatedAt: row.updated_at,
    };
  }
  async save(actor: string, dto: SettingsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM system_settings WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=1`;
      const before = await tx.system_settings.findUniqueOrThrow({
        where: { id: 1 },
      });
      if (before.version !== dto.expectedVersion)
        throw new ConflictException(
          'Cài đặt đã được thay đổi. Tải lại trước khi lưu.',
        );
      const after = await tx.system_settings.update({
        where: { id: 1 },
        data: {
          store_name: dto.storeName,
          support_email: dto.supportEmail,
          support_phone: dto.supportPhone,
          store_address: dto.storeAddress,
          shipping_fee: dto.shippingFee,
          free_shipping_threshold: dto.freeShippingThreshold,
          version: { increment: 1 },
          updated_at: new Date(),
        },
      });
      await tx.audit_logs.create({
        data: {
          user_id: actor,
          action: 'SETTINGS_UPDATED',
          entity_type: 'SETTINGS',
          entity_id: 1n,
          old_data: JSON.stringify(before),
          new_data: JSON.stringify(after),
        },
      });
      return { version: after.version };
    });
  }
}
