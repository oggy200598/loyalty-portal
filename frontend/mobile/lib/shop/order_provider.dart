import '../common/api_client.dart';
import 'package:flutter/foundation.dart';

import 'order.dart';
import 'order_service.dart';

class OrderProvider extends ChangeNotifier {
  final OrderService orderService;

  List<Order> _orders = [];

  int _generation = 0;
  void clearMemory() {
    _generation++;
    _orders = [];
    error = null;
    loading = false;
    notifyListeners();
  }

  bool loading = false;
  String? error;

  OrderProvider({required this.orderService});

  List<Order> get orders => List.unmodifiable(_orders);

  Future<void> loadOrders() async {
    final generation = _generation;
    loading = true;
    error = null;
    notifyListeners();

    try {
      final orders = await orderService.getOrders();
      if (generation != _generation) return;
      _orders = orders;
    } catch (err) {
      if (generation == _generation) error = errorMessage(err);
    } finally {
      if (generation == _generation) {
        loading = false;
        notifyListeners();
      }
    }
  }

  Future<Order?> getOrderById(String id) {
    return orderService.getOrderById(id);
  }

  /// Đặt hàng. Backend sẽ xác nhận giá cuối khi API sẵn sàng.
  Future<Order> placeOrder(Order order, {String? couponCode}) async {
    final generation = _generation;
    final created = await orderService.placeOrder(
      order,
      couponCode: couponCode,
    );
    if (generation == _generation) {
      _orders = [created, ..._orders];
      notifyListeners();
    }
    return created;
  }
}
