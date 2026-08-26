import 'package:flutter/foundation.dart';

import '../core/storage/local_storage.dart';
import '../models/cart_item.dart';
import '../services/cart_service.dart';

/// Quản lý giỏ hàng: local-first, đồng bộ backend khi đã đăng nhập.
///
/// - Khi chưa đăng nhập: chỉ dùng local storage (như trước).
/// - Khi đăng nhập: mọi thao tác ghi qua Cart API; load() kéo giỏ từ server.
/// - Nếu API lỗi (mạng/server), fallback về local để không chặn luồng mua hàng.
class CartProvider extends ChangeNotifier {
  final LocalStorage storage;
  final CartService? cartService;

  List<CartItem> _items = [];
  bool _syncing = false;

  CartProvider({required this.storage, this.cartService});

  List<CartItem> get items => List.unmodifiable(_items);

  int get itemCount =>
      _items.fold(0, (sum, item) => sum + item.quantity);

  num get subtotal => _items.fold(
        0,
        (sum, item) => sum + item.subtotal,
      );

  bool get isSynced => cartService != null;

  /// Load giỏ: ưu tiên từ backend nếu có service (đã đăng nhập), lỗi thì local.
  Future<void> load() async {
    if (cartService != null && !_syncing) {
      try {
        _syncing = true;
        final remote = await cartService!.fetchCart();
        _items = remote.map(_itemFromApi).toList();
        notifyListeners();
        return;
      } catch (_) {
        // fallback local bên dưới
      } finally {
        _syncing = false;
      }
    }

    final raw = await storage.getCart();
    _items = raw.map(CartItem.fromJson).toList();
    notifyListeners();
  }

  Future<void> add(CartItem newItem) async {
    // Thử sync lên backend trước
    if (cartService != null) {
      try {
        await cartService!.addItem(
          productId: num.parse(newItem.productId),
          quantity: newItem.quantity,
          variantId:
              newItem.variantId != null ? num.tryParse(newItem.variantId!) : null,
        );
        await load();
        return;
      } catch (_) {
        // fallback local
      }
    }

    final index = _items.indexWhere(
      (item) =>
          item.productId == newItem.productId &&
          item.variantId == newItem.variantId,
    );

    if (index >= 0) {
      final existing = _items[index];
      final mergedQuantity = (existing.quantity + newItem.quantity)
          .clamp(0, existing.stockQuantity);

      _items[index] = existing.copyWith(quantity: mergedQuantity);
    } else {
      _items.add(newItem);
    }

    await _persist();
  }

  Future<void> updateQuantity(
    int index,
    int quantity,
  ) async {
    if (index < 0 || index >= _items.length) return;
    if (quantity < 1) return;

    final item = _items[index];
    final capped = quantity.clamp(1, item.stockQuantity);

    if (cartService != null && item.apiItemId != null) {
      try {
        await cartService!.updateItem(item.apiItemId!, capped);
        await load();
        return;
      } catch (_) {
        // fallback local
      }
    }

    _items[index] = item.copyWith(quantity: capped);
    await _persist();
  }

  Future<void> removeAt(int index) async {
    if (index < 0 || index >= _items.length) return;

    final item = _items[index];

    if (cartService != null && item.apiItemId != null) {
      try {
        await cartService!.removeItem(item.apiItemId!);
        _items.removeAt(index);
        notifyListeners();
        return;
      } catch (_) {
        // fallback local
      }
    }

    _items.removeAt(index);
    await _persist();
  }

  Future<void> clear() async {
    if (cartService != null) {
      try {
        await cartService!.clearCart();
      } catch (_) {
        // vẫn xóa local
      }
    }
    _items = [];
    await _persist();
  }

  Future<void> _persist() async {
    await storage.setCart(
      _items.map((item) => item.toJson()).toList(),
    );
    notifyListeners();
  }

  /// Map item snake_case từ backend sang model app.
  static CartItem _itemFromApi(Map<String, dynamic> json) {
    final product = json['products'];
    return CartItem(
      apiItemId: num.tryParse(json['id']?.toString() ?? ''),
      productId: json['product_id']?.toString() ?? '',
      variantId: json['variant_id']?.toString(),
      productName:
          product is Map<String, dynamic> ? product['name']?.toString() ?? '' : '',
      unitPrice:
          num.tryParse(json['price']?.toString() ?? '0') ?? 0,
      quantity: int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      stockQuantity: product is Map<String, dynamic>
          ? int.tryParse(product['stock_quantity']?.toString() ?? '99') ?? 99
          : 99,
    );
  }
}
