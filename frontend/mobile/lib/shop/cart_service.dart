import '../common/api_client.dart';

/// Service gọi Cart API của backend (GET/POST/PATCH/DELETE /cart).
class CartService {
  final ApiClient client;

  CartService(this.client);

  /// Trả về list item dạng map snake_case từ backend.
  Future<List<Map<String, dynamic>>> fetchCart() async {
    final data = await client.get('/cart');
    if (data is! Map<String, dynamic>) return [];
    final items = data['cart_items'];
    if (items is! List) return [];
    return items.whereType<Map<String, dynamic>>().toList();
  }

  Future<void> addItem({
    required num productId,
    required int quantity,
    num? variantId,
  }) async {
    await client.post('/cart/items', {
      'productId': productId,
      'quantity': quantity,
      'variantId': ?variantId,
    });
  }

  Future<void> updateItem(num itemId, int quantity) async {
    await client.patch('/cart/items/$itemId', {'quantity': quantity});
  }

  Future<void> removeItem(num itemId) async {
    await client.delete('/cart/items/$itemId');
  }

  Future<void> clearCart() async {
    await client.delete('/cart');
  }
}
