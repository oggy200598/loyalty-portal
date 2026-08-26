import 'package:flutter/foundation.dart';

import '../models/product.dart';
import '../services/product_service.dart';

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
      productError = error.toString();
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
      categoryError = error.toString();
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
