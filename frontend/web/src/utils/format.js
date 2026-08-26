export function formatCurrency(value) {
  if (value === null || value === undefined) return '---';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
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

export function getCouponLabel(coupon) {
  if (coupon.discountType === 'FREE_SHIP') {
    return 'FREESHIP';
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
