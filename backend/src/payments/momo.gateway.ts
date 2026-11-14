import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class MomoGateway {
  async create(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(
        'https://test-payment.momo.vn/v2/gateway/api/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000),
          redirect: 'error',
        },
      );
      if (!response.ok)
        throw new Error('Dịch vụ thanh toán tạm thời chưa sẵn sàng.');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error('Phản hồi từ dịch vụ không hợp lệ.');
      return data as Record<string, unknown>;
    } catch {
      // Do not invent a successful payment or allocate a second reference on uncertain delivery.
      throw new ServiceUnavailableException(
        'Chưa nhận được phản hồi MoMo. Thử lại sẽ dùng cùng mã thanh toán để tránh thu trùng.',
      );
    }
  }
}
