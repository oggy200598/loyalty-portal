import { createHmac, timingSafeEqual } from 'node:crypto';

export const MOMO_CREATE_FIELDS = [
  'accessKey',
  'amount',
  'extraData',
  'ipnUrl',
  'orderId',
  'orderInfo',
  'partnerCode',
  'redirectUrl',
  'requestId',
  'requestType',
] as const;
export const MOMO_RESPONSE_FIELDS = [
  'accessKey',
  'amount',
  'orderId',
  'partnerCode',
  'payUrl',
  'requestId',
  'responseTime',
  'resultCode',
] as const;
export const MOMO_IPN_FIELDS = [
  'accessKey',
  'amount',
  'extraData',
  'message',
  'orderId',
  'orderInfo',
  'orderType',
  'partnerCode',
  'payType',
  'requestId',
  'responseTime',
  'resultCode',
  'transId',
] as const;

export function momoRaw(
  fields: readonly string[],
  data: Record<string, unknown>,
): string {
  return fields
    .map((key) => {
      const value = data[key];
      if (
        typeof value !== 'string' &&
        !(typeof value === 'number' && Number.isSafeInteger(value))
      )
        throw new Error('Thông tin giao dịch MoMo không hợp lệ.');
      if (String(value).length > 4096)
        throw new Error('Thông tin giao dịch MoMo vượt quá độ dài cho phép.');
      return `${key}=${value}`;
    })
    .join('&');
}
export function signMomo(
  fields: readonly string[],
  data: Record<string, unknown>,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(momoRaw(fields, data), 'utf8')
    .digest('hex');
}
export function verifyMomo(
  fields: readonly string[],
  data: Record<string, unknown>,
  accessKey: string,
  secret: string,
): boolean {
  try {
    if (
      typeof data.signature !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(data.signature)
    )
      return false;
    return timingSafeEqual(
      Buffer.from(signMomo(fields, { ...data, accessKey }, secret), 'hex'),
      Buffer.from(data.signature, 'hex'),
    );
  } catch {
    return false;
  }
}
export function isMomoPayUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.origin === 'https://test-payment.momo.vn' &&
      !url.username &&
      !url.password &&
      url.pathname === '/v2/gateway/pay'
    );
  } catch {
    return false;
  }
}
