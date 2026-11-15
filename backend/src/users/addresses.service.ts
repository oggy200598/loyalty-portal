import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AddressDto, UpdateAddressDto } from './users.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string) {
    return this.prisma.addresses.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: 'desc' }, { id: 'asc' }],
    });
  }
  async save(userId: string, dto: AddressDto | UpdateAddressDto, id?: bigint) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=${userId}`;
      const before =
        id == null
          ? null
          : await tx.addresses.findFirst({ where: { id, user_id: userId } });
      if (id != null && !before)
        throw new NotFoundException('Không tìm thấy địa chỉ');
      if (before && before.version !== (dto as UpdateAddressDto).version)
        throw new ConflictException(
          'Địa chỉ đã thay đổi trên thiết bị khác. Hãy tải lại.',
        );
      const count = await tx.addresses.count({ where: { user_id: userId } });
      if (!before && count >= 20)
        throw new BadRequestException('Chỉ lưu tối đa 20 địa chỉ');
      const isDefault =
        dto.isDefault || count === 0 || before?.is_default === true;
      if (isDefault)
        await tx.addresses.updateMany({
          where: {
            user_id: userId,
            is_default: true,
            ...(id == null ? {} : { id: { not: id } }),
          },
          data: { is_default: false, version: { increment: 1 } },
        });
      const data = {
        receiver_name: dto.receiverName,
        phone: dto.phone,
        province: dto.province,
        district: dto.district,
        ward: dto.ward,
        address_detail: dto.addressDetail,
        is_default: isDefault,
      };
      return before
        ? tx.addresses.update({
            where: { id: before.id },
            data: { ...data, version: { increment: 1 } },
          })
        : tx.addresses.create({ data: { ...data, user_id: userId } });
    });
  }
  async remove(userId: string, id: bigint, version: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=${userId}`;
      const address = await tx.addresses.findFirst({
        where: { id, user_id: userId },
      });
      if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');
      if (address.version !== version)
        throw new ConflictException('Địa chỉ đã thay đổi. Hãy tải lại.');
      // Đơn cũ giữ nguyên ảnh chụp thông tin giao hàng khi xóa sổ địa chỉ.
      await tx.orders.updateMany({
        where: { shipping_address_id: id },
        data: { shipping_address_id: null },
      });
      await tx.addresses.delete({ where: { id } });
      if (address.is_default) {
        const next = await tx.addresses.findFirst({
          where: { user_id: userId },
          orderBy: { id: 'asc' },
        });
        if (next)
          await tx.addresses.update({
            where: { id: next.id },
            data: { is_default: true, version: { increment: 1 } },
          });
      }
      return { success: true };
    });
  }
}
