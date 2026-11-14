import { createHmac, timingSafeEqual } from 'node:crypto';

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
