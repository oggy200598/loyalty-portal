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

export function canonicalVnpay(params: Record<string, string>): string {
  const encode = (value: string) =>
    encodeURIComponent(value).replace(/%20/g, '+');
  return Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&');
}

export function signVnpay(
  params: Record<string, string>,
  secret: string,
): string {
  return createHmac('sha512', secret)
    .update(canonicalVnpay(params), 'utf8')
    .digest('hex');
}

export function verifyVnpay(
  query: Record<string, unknown>,
  secret: string,
): Record<string, string> | null {
  if (Object.keys(query).length > 40) return null;
  const hash = query.vnp_SecureHash;
  if (typeof hash !== 'string' || !/^[a-f0-9]{128}$/i.test(hash)) return null;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (
      !key.startsWith('vnp_') ||
      key === 'vnp_SecureHash' ||
      key === 'vnp_SecureHashType'
    )
      continue;
    if (typeof value !== 'string' || value.length > 2048) return null;
    params[key] = value;
  }
  const expected = Buffer.from(signVnpay(params, secret), 'hex');
  return timingSafeEqual(expected, Buffer.from(hash, 'hex')) ? params : null;
}

export function vnpayDate(date: Date): string {
  return new Date(date.getTime() + 7 * 3600000)
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
}
