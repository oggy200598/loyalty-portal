import '../core/network/api_client.dart';

/// Service gọi Wishlist API backend (GET/POST/DELETE /wishlist).
class WishlistService {
  final ApiClient client;

  WishlistService(this.client);

  /// Trả về danh sách product_id (string) trong wishlist.
  Future<List<String>> fetchIds() async {
    final data = await client.get('/wishlist');
    if (data is! Map<String, dynamic>) return [];
    final items = data['wishlist_items'];
    if (items is! List) return [];
    return items
        .whereType<Map<String, dynamic>>()
        .map((item) => item['product_id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toList();
  }

  Future<void> add(String productId) async {
    await client.post('/wishlist', {'productId': productId});
  }

  Future<void> remove(String productId) async {
    await client.delete('/wishlist/$productId');
  }
}
