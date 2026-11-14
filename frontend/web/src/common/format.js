export function formatCurrency(value) {
  if (value === null || value === undefined) return '---';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const VALUE_LABELS = {
  MEMBER: 'Thành viên', POINT_LOT: 'Lô điểm', TRANSACTION: 'Giao dịch', REDEMPTION: 'Đổi thưởng', COMPLAINT: 'Khiếu nại', RULE: 'Chính sách', REWARD: 'Phần thưởng',
  REWARD_REDEEMED: 'Đổi thưởng thành công', COMPLAINT_CREATED: 'Tạo khiếu nại', COMPLAINT_UPDATED: 'Cập nhật khiếu nại', RULE_PUBLISHED: 'Áp dụng chính sách', REWARD_CREATED: 'Tạo phần thưởng', REWARD_STATUS_CHANGED: 'Đổi trạng thái phần thưởng', ADJUSTMENT_REQUESTED: 'Đề nghị điều chỉnh điểm', ADJUSTMENT_APPROVED: 'Xác nhận điều chỉnh điểm', ADJUSTMENT_REJECTED: 'Từ chối điều chỉnh điểm',
  BRONZE: 'Đồng', SILVER: 'Bạc', GOLD: 'Vàng', PLATINUM: 'Bạch kim', CRITICAL: 'Rất cao', BLOCK_BUYER: 'Tạm dừng xử lý khách hàng',
  MEMBER_ENROLLED: 'Tham gia chương trình', TIER_CHANGED: 'Thay đổi hạng', POINTS_EXPIRED: 'Điểm đã hết hạn', ORDER_POINTS_EARNED: 'Cộng điểm đơn hàng', ORDER_POINTS_REVERSED: 'Thu hồi điểm đơn hàng',
  RULE_DRAFT_CREATED: 'Tạo bản nháp chính sách', RULE_DRAFT_UPDATED: 'Cập nhật bản nháp chính sách', REWARD_UPDATED: 'Chỉnh sửa phần thưởng', COUPON_UPDATED: 'Chỉnh sửa mã giảm giá', COUPON_CREATED: 'Tạo mã giảm giá', VERIFICATION_ARCHIVED: 'Lưu trữ tài khoản xác minh',
  LOYALTY_RULE: 'Chính sách tích điểm', LOYALTY_MEMBER: 'Thành viên thân thiết', LOYALTY_REWARD: 'Phần thưởng', LOYALTY_COMPLAINT: 'Khiếu nại', LOYALTY_ADJUSTMENT: 'Điều chỉnh điểm', LOYALTY_REDEMPTION: 'Đổi thưởng',
  ADMIN: 'Quản trị viên', SELLER: 'Người bán', BUYER: 'Khách hàng', SYSTEM: 'Hệ thống',
  ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', SUSPENDED: 'Đã khóa', DELETED: 'Đã xóa', HIDDEN: 'Đang ẩn', OUT_OF_STOCK: 'Hết hàng',
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', RETURNED: 'Đã trả hàng', FAILED: 'Thất bại', NON_RECEIVED: 'Không nhận hàng', OPEN: 'Mới tiếp nhận', IN_REVIEW: 'Đang xử lý', RESOLVED: 'Đã giải quyết', DRAFT: 'Bản nháp', SUBMITTED: 'Chờ công bố', PUBLISHED: 'Đã công bố',
  UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', REFUNDED: 'Đã hoàn tiền', PARTIALLY_REFUNDED: 'Đã hoàn một phần',
  COD: 'Thanh toán khi nhận hàng', E_WALLET: 'Ví MoMo', BANK: 'Chuyển khoản', BANK_TRANSFER: 'Chuyển khoản', CREDIT_CARD: 'Thẻ thanh toán', MOMO: 'MoMo', VNPAY: 'VNPay',
  LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', ACCEPT: 'Chấp nhận', REJECT: 'Từ chối', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', APPLY: 'Áp dụng', APPLIED: 'Đã áp dụng', IGNORE: 'Bỏ qua', IGNORED: 'Đã bỏ qua', APPROVED: 'Đã duyệt',
  EARN: 'Tích điểm', REDEEM: 'Đổi thưởng', EXPIRE: 'Hết hạn', REVERSAL: 'Thu hồi điểm', ADJUSTMENT: 'Điều chỉnh điểm',
  ORDER: 'Đơn hàng', USER: 'Tài khoản', PRODUCT: 'Sản phẩm', CATEGORY: 'Danh mục', SETTINGS: 'Cài đặt', PAYMENT: 'Thanh toán',
  ORDER_STATUS_UPDATED: 'Cập nhật trạng thái đơn', PROFILE_UPDATED: 'Cập nhật hồ sơ', USER_UPDATED: 'Cập nhật tài khoản',
  PRODUCT_CREATED: 'Tạo sản phẩm', PRODUCT_UPDATED: 'Cập nhật sản phẩm', CATEGORY_CREATED: 'Tạo danh mục', CATEGORY_UPDATED: 'Cập nhật danh mục', SETTINGS_UPDATED: 'Cập nhật cài đặt',
  PASSWORD_RESET: 'Đặt lại mật khẩu', PASSWORD_CHANGED: 'Đổi mật khẩu', OPERATOR_PASSWORD_RESET: 'Đặt lại mật khẩu qua công cụ quản trị', COD_PAYMENT_CONFIRMED: 'Xác nhận thu COD',
  REQUEST_DEPOSIT: 'Yêu cầu đặt cọc', REQUIRE_PREPAYMENT: 'Yêu cầu thanh toán trước', MANUAL_REVIEW: 'Kiểm tra thủ công', REVIEW_ORDER: 'Kiểm tra đơn hàng', CONFIRM_ORDER: 'Xác nhận đơn hàng',
};
export function valueLabel(value) { return value == null || value === '' ? '—' : VALUE_LABELS[value] ?? 'Chưa xác định'; }
export function notificationText(value = '') {
  return String(value).replace(/(đã chuyển sang trạng thái\s+)([A-Z_]+)([.!]?)$/u, (_match, prefix, code, punctuation) => `${prefix}${valueLabel(code)}${punctuation}`);
}
export function recommendationText(value = '') {
  return String(value).replace('Kiểm tra lịch sử buyer', 'Kiểm tra lịch sử khách hàng')
    .replace(/Rule score (\d+(?:\.\d+)?)\/100 \(([A-Z_]+)\); chưa phải xác suất ML (?:đã )?được hiệu chỉnh\./g, (_m, score, level) => `Điểm đánh giá theo quy tắc ${score}/100 (${valueLabel(level)}); chưa phải xác suất dự đoán đã được hiệu chỉnh.`);
}

export function formatSold(value) {
  const sold = Number(value ?? 0);

  if (sold >= 1_000_000) {
    return `${(sold / 1_000_000)
      .toFixed(1)
      .replace('.0', '')}tr+`;
  }

  if (sold >= 1000) {
    return `${Math.floor(sold / 1000)}k+`;
  }

  return sold;
}

export function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('vi-VN').format(
    new Date(value),
  );
}

export function formatDateTime(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function normalizeText(value) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function categoryPath(category) {
  const slug = normalizeText(category.name)
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '') || 'danhmuc';
  return `/danhmuc/${slug}`;
}

export function categoryIdFromPath(value) {
  return String(value ?? '').match(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*-)?([1-9][0-9]*)$/)?.[1] ?? null;
}

export function categoryForPath(categories, value) {
  const matches = categories.filter(item => categoryPath(item) === `/danhmuc/${value}`);
  if (matches.length > 1) throw new Error('Tên danh mục bị trùng. Vui lòng liên hệ cửa hàng.');
  return matches[0] ?? categories.find(item => String(item.id) === categoryIdFromPath(value)) ?? null;
}

export function getCouponLabel(coupon) {
  if (coupon.discountType === 'FREE_SHIP') {
    return "Miễn phí vận chuyển";
  }

  if (coupon.discountType === 'PERCENT') {
    return `Giảm ${coupon.discountValue}%`;
  }

  if (coupon.discountType === 'FIXED') {
    return `Giảm ${formatCurrency(coupon.discountValue)}`;
  }

  return 'Ưu đãi';
}

export function getCouponTitle(coupon) {
  if (coupon.discountType === 'FREE_SHIP') {
    return `${coupon.name} - Đơn từ ${formatCurrency(coupon.minOrderValue)}`;
  }

  if (coupon.discountType === 'PERCENT') {
    return `${coupon.name} - Đơn từ ${formatCurrency(coupon.minOrderValue)}${
      coupon.maxDiscount
        ? ` - Tối đa ${formatCurrency(coupon.maxDiscount)}`
        : ''
    }`;
  }

  if (coupon.discountType === 'FIXED') {
    return `${coupon.name} - Đơn từ ${formatCurrency(coupon.minOrderValue)}`;
  }

  return coupon.name;
}

/**
 * Kiểm tra coupon có áp dụng được cho đơn không.
 * LƯU Ý: chỉ dùng để hiển thị gợi ý trên UI.
 * Giá cuối cùng phải do backend xác nhận.
 */
export function isCouponApplicable(coupon, subtotal) {
  const min = Number(coupon.minOrderValue ?? 0);
  return subtotal >= min;
}

export function calcCouponDiscount(coupon, subtotal) {
  if (!isCouponApplicable(coupon, subtotal)) return 0;

  if (coupon.discountType === 'FIXED') {
    return Math.min(
      Number(coupon.discountValue ?? 0),
      subtotal,
    );
  }

  if (coupon.discountType === 'PERCENT') {
    const raw =
      (subtotal * Number(coupon.discountValue ?? 0)) /
      100;

    return Math.min(
      Math.round(raw),
      Number(coupon.maxDiscount ?? Infinity),
      subtotal,
    );
  }

  return 0; // FREE_SHIP giảm phí ship, xử lý riêng
}
