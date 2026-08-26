import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    products: { findMany: jest.Mock };
    orders: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    order_status_history: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const buyer = { id: 'buyer-uuid', role: 'BUYER' };

  beforeEach(async () => {
    prisma = {
      products: { findMany: jest.fn() },
      orders: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      order_status_history: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('placeOrder', () => {
    const dto = {
      customerName: 'Nguyen Van A',
      phone: '0901234567',
      address: '123 ABC',
      paymentMethod: 'COD',
      subtotal: 100,
      discount: 0,
      shippingFee: 10,
      total: 110,
      items: [
        {
          productId: 1,
          productName: 'P1',
          variantName: '',
          imageUrl: '',
          unitPrice: 50,
          quantity: 2,
        },
      ],
    };

    it('ném lỗi khi giỏ hàng trống', async () => {
      await expect(
        service.placeOrder(buyer.id, { ...dto, items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi khi không tìm thấy sản phẩm', async () => {
      prisma.products.findMany.mockResolvedValue([]);

      await expect(service.placeOrder(buyer.id, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tạo đơn với buyer_id từ token', async () => {
      prisma.products.findMany.mockResolvedValue([
        { id: BigInt(1), shop_id: BigInt(5) },
      ]);
      prisma.orders.create.mockResolvedValue({ id: BigInt(9) });

      await service.placeOrder(buyer.id, dto);

      expect(prisma.orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyer_id: buyer.id,
            shop_id: BigInt(5),
            status: 'CONFIRMED',
          }),
        }),
      );
    });
  });

  describe('getOrderByIdForUser', () => {
    it('BUYER bị chặn xem đơn của người khác', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: BigInt(1),
        buyer_id: 'other-uuid',
        status: 'CONFIRMED',
      });

      await expect(
        service.getOrderByIdForUser(buyer, BigInt(1)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('404 khi đơn không tồn tại', async () => {
      prisma.orders.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrderByIdForUser(buyer, BigInt(99)),
      ).rejects.toThrow(NotFoundException);
    });

    it('SELLER xem được mọi đơn', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: BigInt(1),
        buyer_id: 'other-uuid',
        status: 'CONFIRMED',
        order_status_history: [],
      });

      const result = await service.getOrderByIdForUser(
        { id: 'seller-uuid', role: 'SELLER' },
        BigInt(1),
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('từ chối trạng thái không hợp lệ', async () => {
      await expect(
        service.updateStatus(BigInt(1), 'INVALID', buyer.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('ghi history trong transaction', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: BigInt(1),
        status: 'CONFIRMED',
        order_code: 'ORD1',
        buyer_id: buyer.id,
      });
      prisma.orders.update.mockResolvedValue({ id: BigInt(1) });
      prisma.order_status_history.create.mockResolvedValue({});
      prisma.$transaction.mockResolvedValue([{ id: BigInt(1) }, {}]);

      await service.updateStatus(BigInt(1), 'PROCESSING', buyer.id);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.order_status_history.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          old_status: 'CONFIRMED',
          new_status: 'PROCESSING',
          changed_by: buyer.id,
        }),
      });
    });
  });
});
