import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyOrdersService } from '../loyalty/loyalty-orders.service';
import {
  canonicalVnpay,
  signVnpay,
  verifyVnpay,
  vnpayDate,
} from './payment-signatures';

const eligibleStatuses = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
];

@Injectable()
export class VnpayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyOrdersService,
  ) {}

  availability() {
    try {
      this.config();
      return { enabled: true };
    } catch {
      return { enabled: false };
    }
  }

  private config() {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secret = process.env.VNPAY_HASH_SECRET;
    const returnUrl = process.env.VNPAY_RETURN_URL;
    if (!tmnCode || !secret || !returnUrl)
      throw new ServiceUnavailableException(
        'VNPay chưa được cấu hình. Vui lòng chọn COD hoặc liên hệ cửa hàng.',
      );
    const gateway =
      process.env.VNPAY_URL ??
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const target = new URL(gateway);
    if (
      target.protocol !== 'https:' ||
      !['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(target.hostname)
    )
      throw new ServiceUnavailableException(
        'Cấu hình cổng thanh toán VNPay không hợp lệ.',
      );
    return { tmnCode, secret, returnUrl, gateway };
  }

  async create(orderId: bigint, buyerId: string, ip: string) {
    const config = this.config();
    const now = new Date();
    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${orderId}`;
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });
      if (!order || order.buyer_id !== buyerId)
        throw new NotFoundException('Không tìm thấy đơn hàng');
      if (
        !eligibleStatuses.includes(order.status) ||
        order.payment_status !== 'UNPAID' ||
        order.payments.length !== 1 ||
        order.payments[0].status !== 'UNPAID' ||
        order.payments[0].method !== 'BANK_TRANSFER'
      )
        throw new BadRequestException(
          'Đơn hàng không phù hợp để thanh toán VNPay',
        );
      if (
        !order.total_amount.equals(order.total_amount.floor()) ||
        order.total_amount.lte(0)
      )
        throw new BadRequestException('Số tiền VND phải là số nguyên dương');
      const existing = await tx.payment_attempts.findFirst({
        where: {
          order_id: orderId,
          provider: 'VNPAY',
          status: 'PENDING',
          expires_at: { gt: now },
        },
        orderBy: { created_at: 'desc' },
      });
      if (existing) return existing;
      return tx.payment_attempts.create({
        data: {
          id: randomUUID().replaceAll('-', ''),
          order_id: orderId,
          amount: order.total_amount,
          expires_at: new Date(now.getTime() + 15 * 60000),
        },
      });
    });
    const normalizedIp = ip.replace(/^::ffff:/, '');
    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.tmnCode,
      vnp_Amount: attempt.amount.mul(100).toFixed(0),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: attempt.id,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: config.returnUrl,
      vnp_IpAddr: isIP(normalizedIp) ? normalizedIp : '127.0.0.1',
      vnp_CreateDate: vnpayDate(attempt.created_at),
      vnp_ExpireDate: vnpayDate(attempt.expires_at),
    };
    return {
      paymentUrl: `${config.gateway}?${canonicalVnpay(params)}&vnp_SecureHash=${signVnpay(params, config.secret)}`,
      expiresAt: attempt.expires_at,
      attemptId: attempt.id,
    };
  }

  async ipn(query: Record<string, unknown>) {
    const reply = (RspCode: string, Message: string) => ({ RspCode, Message });
    try {
      const config = this.config();
      const params = verifyVnpay(query, config.secret);
      if (!params || params.vnp_TmnCode !== config.tmnCode)
        return reply('97', 'Invalid signature');
      if (!/^[a-f0-9]{32}$/.test(params.vnp_TxnRef ?? ''))
        return reply('01', 'Order not found');
      const found = await this.prisma.payment_attempts.findUnique({
        where: { id: params.vnp_TxnRef },
      });
      if (!found || found.provider !== 'VNPAY')
        return reply('01', 'Order not found');
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM orders WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${found.order_id}`;
          const attempt = await tx.payment_attempts.findUniqueOrThrow({
            where: { id: found.id },
          });
          const order = await tx.orders.findUniqueOrThrow({
            where: { id: found.order_id },
            include: { payments: true },
          });
          if (
            params.vnp_Amount !== attempt.amount.mul(100).toFixed(0) ||
            !attempt.amount.equals(order.total_amount)
          )
            return reply('04', 'Số tiền thanh toán không hợp lệ.');
          if (attempt.status === 'PAID')
            return reply('02', 'Order already confirmed');
          if (
            params.vnp_ResponseCode !== '00' ||
            params.vnp_TransactionStatus !== '00'
          ) {
            await tx.payment_attempts.update({
              where: { id: attempt.id },
              data: { status: 'FAILED' },
            });
            return reply('00', 'Failure recorded');
          }
          if (
            !/^[0-9]{1,100}$/.test(params.vnp_TransactionNo ?? '') ||
            /^0+$/.test(params.vnp_TransactionNo)
          )
            return reply('99', 'Invalid transaction reference');
          // Keep every authenticated receipt, including late/duplicate payments, for manual reconciliation.
          const paidAt = new Date();
          await tx.payment_attempts.update({
            where: { id: attempt.id },
            data: {
              status: 'PAID',
              provider_transaction: params.vnp_TransactionNo,
              paid_at: paidAt,
            },
          });
          const payable =
            eligibleStatuses.includes(order.status) &&
            order.payment_status === 'UNPAID' &&
            order.payments.length === 1 &&
            order.payments[0].status === 'UNPAID' &&
            order.payments[0].method === 'BANK_TRANSFER';
          if (payable) {
            await tx.payments.update({
              where: { id: order.payments[0].id },
              data: {
                status: 'PAID',
                transaction_code: `VNPAY:${params.vnp_TransactionNo}`,
                paid_at: paidAt,
              },
            });
            await tx.orders.update({
              where: { id: order.id },
              data: { payment_status: 'PAID' },
            });
            await this.loyalty.syncOrder(tx, order.id);
          }
          await tx.audit_logs.create({
            data: {
              action: payable
                ? 'VNPAY_PAYMENT_CONFIRMED'
                : 'VNPAY_RECONCILIATION_REQUIRED',
              entity_type: 'ORDER',
              entity_id: order.id,
              new_data: JSON.stringify({
                attemptId: attempt.id,
                transaction: params.vnp_TransactionNo,
                amount: attempt.amount.toString(),
              }),
            },
          });
          return reply(
            '00',
            payable ? 'Confirm Success' : 'Receipt recorded for reconciliation',
          );
        },
        { timeout: 15000 },
      );
    } catch {
      return reply('99', 'Unable to confirm');
    }
  }

  async returnUrl(query: Record<string, unknown>) {
    const origin = process.env.WEB_PUBLIC_URL ?? 'http://localhost:5173';
    const config = this.config();
    const params = verifyVnpay(query, config.secret);
    if (
      !params ||
      params.vnp_TmnCode !== config.tmnCode ||
      !/^[a-f0-9]{32}$/.test(params.vnp_TxnRef ?? '')
    )
      return `${origin}/orders?payment=unverified`;
    const attempt = await this.prisma.payment_attempts.findUnique({
      where: { id: params.vnp_TxnRef },
    });
    return attempt?.provider === 'VNPAY'
      ? `${origin}/orders/${attempt.order_id}?payment=returned`
      : `${origin}/orders?payment=unverified`;
  }
}
