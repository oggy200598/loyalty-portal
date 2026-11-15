import '../common/api_client.dart';
import 'package:flutter/foundation.dart';

import 'product.dart';

class ProductProvider extends ChangeNotifier {
  final ProductService productService;

  List<Product> _products = [];
  List<ProductCategory> _categories = [];

  bool loadingProducts = false;
  bool loadingCategories = false;
  String? productError;
  String? categoryError;

  ProductProvider({required this.productService});

  List<Product> get products => List.unmodifiable(_products);

  List<ProductCategory> get categories => List.unmodifiable(_categories);

  Future<void> loadHomeData({int limit = 36}) async {
    await Future.wait([loadProducts(limit: limit), loadCategories()]);
  }

  Future<void> loadProducts({int limit = 36}) async {
    loadingProducts = true;
    productError = null;
    notifyListeners();

    try {
      _products = await productService.getProducts(limit: limit);
    } catch (error) {
      productError = errorMessage(error);
    } finally {
      loadingProducts = false;
      notifyListeners();
    }
  }

  Future<void> loadCategories() async {
    loadingCategories = true;
    categoryError = null;
    notifyListeners();

    try {
      _categories = await productService.getCategories();
    } catch (error) {
      categoryError = errorMessage(error);
    } finally {
      loadingCategories = false;
      notifyListeners();
    }
  }

  Future<Product> getProductDetail(String id) {
    return productService.getProductById(id);
  }

  Future<List<Product>> getProductsByCategory(String categoryId) {
    return productService.getProductsByCategory(categoryId);
  }
}

class ProductService {
  final ApiClient client;
  ProductService(this.client);

  Future<List<Product>> _products(String path) async {
    final data = await client.get(path) as List;
    return data.cast<Map<String, dynamic>>().map(Product.fromJson).toList();
  }

  Future<List<Product>> getProducts({int limit = 36}) =>
      _products('/products?limit=$limit');

  Future<Product> getProductById(String id) async => Product.fromJson(
    await client.get('/products/$id') as Map<String, dynamic>,
  );

  Future<List<ProductCategory>> getCategories() async {
    final data = await client.get('/categories') as List;
    return data
        .cast<Map<String, dynamic>>()
        .map(ProductCategory.fromJson)
        .toList();
  }

  Future<List<Product>> getProductsByCategory(String categoryId) =>
      _products('/categories/$categoryId/products');
}
