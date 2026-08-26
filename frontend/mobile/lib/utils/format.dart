/// Format tiền tệ VND: 1234500 -> "1.234.500₫"
String formatCurrency(num value) {
  final text = value.round().toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (match) => '.',
  );

  return '${text}₫';
}

/// Format số lượng đã bán: 1500 -> "1k+ đã bán"
String formatSold(int sold) {
  if (sold >= 1000) return '${sold ~/ 1000}k+ đã bán';
  return '$sold đã bán';
}

/// Nhãn ngắn của coupon: FREESHIP / Giảm 15% / Giảm 50.000₫
String couponLabel(String discountType, num? discountValue) {
  if (discountType == 'FREE_SHIP') return 'FREESHIP';
  if (discountType == 'PERCENT') {
    return 'Giảm ${discountValue?.round() ?? 0}%';
  }
  return 'Giảm ${formatCurrency(discountValue ?? 0)}';
}

/// Coupon có áp dụng được cho đơn hàng không (chỉ để gợi ý UI —
/// giá cuối do backend xác nhận).
bool isCouponApplicable({
  required String discountType,
  required num? discountValue,
  required num minOrderValue,
  required num subtotal,
}) {
  return subtotal >= minOrderValue;
}

/// Số tiền giảm dự kiến (FREE_SHIP trả về 0 — xử lý phí ship riêng).
num calcCouponDiscount({
  required String discountType,
  required num? discountValue,
  required num? maxDiscount,
  required num subtotal,
}) {
  if (discountType == 'FIXED') {
    final value = discountValue ?? 0;
    return value > subtotal ? subtotal : value;
  }

  if (discountType == 'PERCENT') {
    final raw = subtotal * (discountValue ?? 0) / 100;
    final capped = maxDiscount != null && raw > maxDiscount ? maxDiscount : raw;
    return capped.round();
  }

  return 0;
}
