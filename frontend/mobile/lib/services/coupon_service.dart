import '../core/network/api_client.dart';
import '../models/product.dart';

/// Coupon lấy từ product.coupons (backend gắn coupon theo sản phẩm/danh mục).
/// Ghi chú: khi backend có endpoint /coupons riêng, bổ sung tại đây.
class CouponService {
  final ApiClient client;

  CouponService(this.client);

  Future<List<Coupon>> getCouponsFromProducts({
    int limit = 36,
  }) async {
    final data = await client.get('/products?limit=$limit');

    final products = (data as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();

    final map = <String, Coupon>{};

    for (final product in products) {
      for (final coupon in product.coupons) {
        map.putIfAbsent(coupon.id, () => coupon);
      }
    }

    return map.values.toList();
  }
}
