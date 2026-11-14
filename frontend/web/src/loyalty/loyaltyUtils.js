export const LOYALTY_LABELS = {
  EARN: 'Tích điểm', REDEEM: 'Đổi thưởng', EXPIRE: 'Hết hạn', REVERSAL: 'Thu hồi khi hoàn/hủy đơn', ADJUSTMENT: 'Điều chỉnh đã duyệt',
  OPEN: 'Mới tiếp nhận', IN_REVIEW: 'Đang xử lý', RESOLVED: 'Đã giải quyết', REJECTED: 'Đã từ chối',
  PENDING: 'Chờ phê duyệt', APPROVED: 'Đã phê duyệt', DRAFT: 'Bản nháp', SUBMITTED: 'Chờ duyệt', PUBLISHED: 'Đã phê duyệt',
  MISSING_POINTS: 'Thiếu điểm', WRONG_POINTS: 'Sai điểm', TIER: 'Hạng thành viên', REDEMPTION: 'Đổi thưởng', OTHER: 'Vấn đề khác',
};

export function loyaltyError(error) {
  const raw = error instanceof Error ? error.message : 'Không thực hiện được thao tác';
  try { const body = JSON.parse(raw); return Array.isArray(body.message) ? body.message.join('. ') : body.message ?? raw; }
  catch { return raw; }
}

function storedKey(name, storage) {
  let key = storage.getItem(name);
  if (!key) { key = crypto.randomUUID(); storage.setItem(name, key); }
  return { key, clear: () => storage.removeItem(name) };
}

export function redemptionKey(memberId, rewardId, storage = sessionStorage) {
  return storedKey(`loyalty_redeem:${memberId}:${rewardId}`, storage);
}

export async function adjustmentKey(actorId, payload, storage = sessionStorage) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const signature = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  return storedKey(`loyalty_adjustment:${actorId}:${signature}`, storage);
}

export const DEFAULT_RULE_FORM = {
  spendPerPoint: 10000, expiryDays: 365, tierPeriodDays: 365,
  tiers: [
    { code: 'BRONZE', name: 'Đồng', minimumSpend: 0, multiplierBps: 10000 },
    { code: 'SILVER', name: 'Bạc', minimumSpend: 2000000, multiplierBps: 11000 },
    { code: 'GOLD', name: 'Vàng', minimumSpend: 10000000, multiplierBps: 12500 },
    { code: 'PLATINUM', name: 'Bạch kim', minimumSpend: 30000000, multiplierBps: 15000 },
  ],
};
