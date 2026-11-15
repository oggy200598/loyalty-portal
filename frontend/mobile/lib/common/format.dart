num number(dynamic value) => num.tryParse('$value') ?? 0;

String formatDate(dynamic value) {
  final parsed = DateTime.tryParse('$value')?.toLocal();
  return parsed == null ? '' : '${parsed.day}/${parsed.month}/${parsed.year}';
}

String valueLabel(dynamic value) {
  const labels = {
    'ADMIN': 'Quản trị viên',
    'SELLER': 'Người bán',
    'BUYER': 'Khách hàng',
    'ACTIVE': 'Đang hoạt động',
    'INACTIVE': 'Ngừng hoạt động',
    'SUSPENDED': 'Đã khóa',
    'PENDING': 'Chờ xử lý',
    'CONFIRMED': 'Đã xác nhận',
    'PROCESSING': 'Đang chuẩn bị',
    'SHIPPING': 'Đang giao',
    'DELIVERED': 'Đã giao',
    'COMPLETED': 'Hoàn tất',
    'CANCELLED': 'Đã hủy',
    'RETURNED': 'Đã trả hàng',
    'FAILED': 'Thất bại',
    'NON_RECEIVED': 'Không nhận hàng',
    'UNPAID': 'Chưa thanh toán',
    'PAID': 'Đã thanh toán',
    'REFUNDED': 'Đã hoàn tiền',
    'PARTIALLY_REFUNDED': 'Đã hoàn một phần',
    'COD': 'Thanh toán khi nhận hàng',
    'MOMO': 'Ví MoMo',
    'E_WALLET': 'Ví MoMo',
    'BANK': 'Chuyển khoản',
    'BANK_TRANSFER': 'Chuyển khoản',
    'CREDIT_CARD': 'Thẻ thanh toán',
    'VNPAY': 'VNPay',
    'EARN': 'Tích điểm',
    'REDEEM': 'Đổi thưởng',
    'EXPIRE': 'Hết hạn',
    'REVERSAL': 'Thu hồi điểm',
    'ADJUSTMENT': 'Điều chỉnh điểm',
    'OPEN': 'Mới tiếp nhận',
    'IN_REVIEW': 'Đang xử lý',
    'RESOLVED': 'Đã giải quyết',
    'REJECTED': 'Đã từ chối',
  };
  return value == null || '$value'.isEmpty
      ? '—'
      : labels['$value'] ?? 'Chưa xác định';
}

String notificationText(String text) => text.replaceFirstMapped(
  RegExp(r'(đã chuyển sang trạng thái\s+)([A-Z_]+)([.!]?)$'),
  (m) => '${m[1]}${valueLabel(m[2])}${m[3]}',
);

String formatCurrency(num value) {
  final text = value.round().toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (match) => '.',
  );

  return '$text₫';
}

/// Format số lượng đã bán: 1500 -> "1k+ đã bán"
String formatSold(int sold) {
  if (sold >= 1000) return '${sold ~/ 1000}k+ đã bán';
  return '$sold đã bán';
}

/// Nhãn ngắn của coupon: FREESHIP / Giảm 15% / Giảm 50.000₫
String couponLabel(String discountType, num? discountValue) {
  if (discountType == 'FREE_SHIP') return 'Miễn phí vận chuyển';
  if (discountType == 'PERCENT') {
    return 'Giảm ${discountValue?.round() ?? 0}%';
  }
  return 'Giảm ${formatCurrency(discountValue ?? 0)}';
}
