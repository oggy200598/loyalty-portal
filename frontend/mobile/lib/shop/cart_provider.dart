import 'package:flutter/foundation.dart';
import '../common/local_storage.dart';
import 'cart_item.dart';
import 'cart_service.dart';

class CartProvider extends ChangeNotifier {
  final LocalStorage storage;
  final CartService? cartService;
  List<CartItem> _items = [];
  int _generation = 0;
  CartProvider({required this.storage, this.cartService});
  List<CartItem> get items => List.unmodifiable(_items);
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);
  num get subtotal => _items.fold(0, (sum, item) => sum + item.subtotal);
  bool get isSynced => storage.userId != null && cartService != null;
  void clearMemory() {
    _generation++;
    _items = [];
    notifyListeners();
  }

  void forgetPurchased(List<CartItem> purchased) {
    for (final bought in purchased) {
      final index = _items.indexWhere(
        (item) =>
            item.productId == bought.productId &&
            item.variantId == bought.variantId,
      );
      if (index < 0) continue;
      final remaining = _items[index].quantity - bought.quantity;
      if (remaining <= 0) {
        _items.removeAt(index);
      } else {
        _items[index] = _items[index].copyWith(quantity: remaining);
      }
    }
    notifyListeners();
  }

  Future<void> load() async {
    final generation = _generation;
    final data = isSynced
        ? (await cartService!.fetchCart()).map(_itemFromApi).toList()
        : (await storage.getCart()).map(CartItem.fromJson).toList();
    if (generation != _generation) return;
    _items = data;
    notifyListeners();
  }

  Future<void> add(CartItem item) async {
    if (isSynced) {
      await cartService!.addItem(
        productId: num.parse(item.productId),
        variantId: item.variantId == null ? null : num.parse(item.variantId!),
        quantity: item.quantity,
      );
      await load();
      return;
    }
    final index = _items.indexWhere(
      (entry) =>
          entry.productId == item.productId &&
          entry.variantId == item.variantId,
    );
    if (index < 0) {
      _items.add(item);
    } else {
      _items[index] = _items[index].copyWith(
        quantity: (_items[index].quantity + item.quantity).clamp(
          1,
          item.stockQuantity,
        ),
      );
    }
    await _persist();
  }

  Future<void> updateQuantity(int index, int quantity) async {
    if (index < 0 || index >= _items.length || quantity < 1) return;
    final item = _items[index];
    if (quantity > item.stockQuantity) return;
    if (isSynced && item.apiItemId != null) {
      await cartService!.updateItem(item.apiItemId!, quantity);
      await load();
      return;
    }
    _items[index] = item.copyWith(quantity: quantity);
    await _persist();
  }

  Future<void> removeAt(int index) async {
    if (index < 0 || index >= _items.length) return;
    final item = _items[index];
    if (isSynced && item.apiItemId != null) {
      await cartService!.removeItem(item.apiItemId!);
      await load();
      return;
    }
    _items.removeAt(index);
    await _persist();
  }

  Future<void> clear() async {
    if (isSynced) await cartService!.clearCart();
    _items = [];
    await _persist();
  }

  Future<void> _persist() async {
    if (!isSynced) {
      await storage.setCart(_items.map((item) => item.toJson()).toList());
    }
    notifyListeners();
  }

  static CartItem _itemFromApi(Map<String, dynamic> json) {
    final product = json['products'] as Map<String, dynamic>? ?? {};
    final variant = json['product_variants'] as Map<String, dynamic>?;
    final productStock =
        int.tryParse(product['stock_quantity'].toString()) ?? 0;
    final variantStock =
        int.tryParse((variant?['stock_quantity']).toString()) ?? productStock;
    return CartItem(
      apiItemId: num.tryParse(json['id'].toString()),
      productId: json['product_id'].toString(),
      variantId: json['variant_id']?.toString(),
      productName: product['name']?.toString() ?? '',
      variantName: variant?['variant_name']?.toString(),
      unitPrice:
          num.tryParse(
            (variant?['price'] ?? product['price'] ?? json['price']).toString(),
          ) ??
          0,
      quantity: int.tryParse(json['quantity'].toString()) ?? 1,
      stockQuantity: productStock < variantStock ? productStock : variantStock,
    );
  }
}
