import '../core/network/api_client.dart';
import '../models/product.dart';

/// Gọi các endpoint sản phẩm/danh mục/shop có sẵn trên backend.
class ProductService {
  final ApiClient client;

  ProductService(this.client);

  Future<List<Product>> getProducts({int limit = 36}) async {
    final data = await client.get('/products?limit=$limit');
    return (data as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }

  Future<Product> getProductById(String id) async {
    final data = await client.get('/products/$id');
    return Product.fromJson(data as Map<String, dynamic>);
  }

  Future<List<ProductCategory>> getCategories() async {
    final data = await client.get('/categories');
    return (data as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ProductCategory.fromJson)
        .toList();
  }

  /// Endpoint: GET /categories/:id/products (đã tồn tại trên backend).
  Future<List<Product>> getProductsByCategory(String categoryId) async {
    final data = await client.get('/categories/$categoryId/products');

    return (data as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }
}
