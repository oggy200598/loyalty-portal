import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyOrdersService } from '../loyalty/loyalty-orders.service';
import { MomoGateway } from './momo.gateway';
import {
  isMomoPayUrl,
  MOMO_CREATE_FIELDS,
  MOMO_IPN_FIELDS,
  MOMO_RESPONSE_FIELDS,
  signMomo,
  verifyMomo,
} from './momo-signature';

const eligible = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
];
const terminalFailures = new Set([
  1001, 1002, 1003, 1004, 1005, 1006, 1007, 1017, 1026,
]);
@Injectable()
export class MomoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyOrdersService,
    private readonly gateway: MomoGateway,
  ) {}
  private config() {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secret = process.env.MOMO_SECRET_KEY;
    const redirectUrl = process.env.MOMO_REDIRECT_URL;
    const ipnUrl = process.env.MOMO_IPN_URL;
    if (!partnerCode || !accessKey || !secret || !redirectUrl || !ipnUrl)
      throw new ServiceUnavailableException(
        'MoMo sandbox chưa được cấu hình. Vui lòng chọn COD.',
      );
    try {
      if (
        !['http:', 'https:'].includes(new URL(redirectUrl).protocol) ||
        new URL(ipnUrl).protocol !== 'https:'
      )
        throw new Error('Đường dẫn nhận kết quả thanh toán không hợp lệ.');
    } catch {
      throw new ServiceUnavailableException('Cấu hình URL MoMo không hợp lệ');
    }
    return { partnerCode, accessKey, secret, redirectUrl, ipnUrl };
  }
  availability() {
    try {
      this.config();
      return { enabled: true, environment: 'sandbox' };
    } catch {
      return { enabled: false, environment: 'sandbox' };
    }
  }

  async create(orderId: bigint, buyerId: string) {
    const config = this.config();
    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${orderId}`;
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });
      if (!order || order.buyer_id !== buyerId)
        throw new NotFoundException('Không tìm thấy đơn hàng');
      if (
        !eligible.includes(order.status) ||
        order.payment_status !== 'UNPAID' ||
        order.payments.length !== 1 ||
        order.payments[0].method !== 'E_WALLET' ||
        order.payments[0].status !== 'UNPAID'
      )
        throw new BadRequestException('Đơn không phù hợp để thanh toán MoMo');
      if (
        !order.total_amount.isInteger() ||
        order.total_amount.lt(1000) ||
        order.total_amount.gt(50000000)
      )
        throw new BadRequestException(
          'MoMo hỗ trợ số tiền nguyên từ 1.000 đến 50.000.000đ',
        );
      const existing = await tx.payment_attempts.findFirst({
        where: { order_id: orderId, provider: 'MOMO', status: 'PENDING' },
        orderBy: { created_at: 'desc' },
      });
      // Even after local timeout, retain an uncertain reference until a verified terminal result.
      return (
        existing ??
        tx.payment_attempts.create({
          data: {
            id: randomUUID().replaceAll('-', ''),
            provider: 'MOMO',
            order_id: orderId,
            amount: order.total_amount,
            expires_at: new Date(Date.now() + 15 * 60000),
          },
        })
      );
    });
    if (attempt.payment_url)
      return { paymentUrl: attempt.payment_url, attemptId: attempt.id };
    const payload = {
      partnerCode: config.partnerCode,
      requestId: attempt.id,
      orderId: attempt.id,
      amount: attempt.amount.toNumber(),
      orderInfo: `Thanh toan don hang ${orderId}`,
      redirectUrl: config.redirectUrl,
      ipnUrl: config.ipnUrl,
      extraData: '',
      requestType: 'captureWallet',
      autoCapture: true,
      lang: 'vi',
    };
    const response = await this.gateway.create({
      ...payload,
      signature: signMomo(
        MOMO_CREATE_FIELDS,
        { ...payload, accessKey: config.accessKey },
        config.secret,
      ),
    });
    if (
      !verifyMomo(
        MOMO_RESPONSE_FIELDS,
        response,
        config.accessKey,
        config.secret,
      ) ||
      response.partnerCode !== config.partnerCode ||
      response.orderId !== attempt.id ||
      response.requestId !== attempt.id ||
      String(response.amount) !== attempt.amount.toFixed(0) ||
      Number(response.resultCode) !== 0 ||
      !isMomoPayUrl(response.payUrl)
    )
      throw new ServiceUnavailableException(
        'MoMo chưa cung cấp phiên thanh toán hợp lệ. Không có khoản thu nào được ghi nhận; hãy thử lại hoặc kiểm tra với cửa hàng.',
      );
    await this.prisma.payment_attempts.updateMany({
      where: { id: attempt.id, provider: 'MOMO', status: 'PENDING' },
      data: { payment_url: response.payUrl },
    });
    return { paymentUrl: response.payUrl, attemptId: attempt.id };
  }

  private verified(body: Record<string, unknown>) {
    const config = this.config();
    if (
      !verifyMomo(MOMO_IPN_FIELDS, body, config.accessKey, config.secret) ||
      body.partnerCode !== config.partnerCode
    )
      throw new UnauthorizedException('Chữ ký xác thực MoMo không hợp lệ.');
    if (
      typeof body.orderId !== 'string' ||
      !/^[a-f0-9]{32}$/.test(body.orderId) ||
      body.requestId !== body.orderId ||
      !/^\d+$/.test(String(body.amount)) ||
      !/^\d+$/.test(String(body.resultCode))
    )
      throw new BadRequestException('Mã giao dịch MoMo không hợp lệ.');
    return body.orderId;
  }
  async ipn(body: Record<string, unknown>) {
    const id = this.verified(body);
    const found = await this.prisma.payment_attempts.findUnique({
      where: { id },
    });
    if (!found || found.provider !== 'MOMO')
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán.');
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${found.order_id}`;
        const attempt = await tx.payment_attempts.findUniqueOrThrow({
          where: { id },
        });
        const order = await tx.orders.findUniqueOrThrow({
          where: { id: found.order_id },
          include: { payments: true },
        });
        if (
          String(body.amount) !== attempt.amount.toFixed(0) ||
          !attempt.amount.equals(order.total_amount)
        )
          throw new BadRequestException('Số tiền thanh toán không hợp lệ.');
        if (attempt.status === 'PAID') return;
        const result = Number(body.resultCode);
        if (result !== 0) {
          if (terminalFailures.has(result))
            await tx.payment_attempts.update({
              where: { id },
              data: { status: 'FAILED' },
            });
          return; // 9000 is authorization only; pending/unknown results never count as received funds.
        }
        const transId = String(body.transId);
        if (!/^[1-9]\d{0,79}$/.test(transId))
          throw new BadRequestException('Giao dịch thanh toán không hợp lệ.');
        const now = new Date();
        await tx.payment_attempts.update({
          where: { id },
          data: {
            status: 'PAID',
            provider_transaction: `MOMO:${transId}`,
            paid_at: now,
          },
        });
        const payable =
          eligible.includes(order.status) &&
          order.payment_status === 'UNPAID' &&
          order.payments.length === 1 &&
          order.payments[0].status === 'UNPAID' &&
          order.payments[0].method === 'E_WALLET';
        if (payable) {
          await tx.payments.update({
            where: { id: order.payments[0].id },
            data: {
              status: 'PAID',
              transaction_code: `MOMO:${transId}`,
              paid_at: now,
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
              ? 'MOMO_PAYMENT_CONFIRMED'
              : 'MOMO_RECONCILIATION_REQUIRED',
            entity_type: 'ORDER',
            entity_id: order.id,
            new_data: JSON.stringify({
              attemptId: id,
              transaction: transId,
              amount: attempt.amount.toString(),
            }),
          },
        });
      },
      { maxWait: 2000, timeout: 10000 },
    );
  }
  async returnUrl(query: Record<string, unknown>) {
    const origin = process.env.WEB_PUBLIC_URL ?? 'http://localhost:5173';
    try {
      const id = this.verified(query);
      const attempt = await this.prisma.payment_attempts.findUnique({
        where: { id },
      });
      if (attempt?.provider === 'MOMO')
        return `${origin}/orders/${attempt.order_id}?payment=returned`;
    } catch {
      /* A browser redirect has no authority to record payment. */
    }
    return `${origin}/orders?payment=unverified`;
  }
}
