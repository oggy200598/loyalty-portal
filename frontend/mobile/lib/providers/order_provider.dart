import 'package:flutter/foundation.dart';

import '../models/order.dart';
import '../services/order_service.dart';

class OrderProvider extends ChangeNotifier {
  final OrderService orderService;

  List<Order> _orders = [];

  bool loading = false;
  String? error;

  OrderProvider({required this.orderService});

  List<Order> get orders => List.unmodifiable(_orders);

  Future<void> loadOrders() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      _orders = await orderService.getOrders();
    } catch (err) {
      error = err.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<Order?> getOrderById(String id) {
    return orderService.getOrderById(id);
  }

  /// Đặt hàng. Backend sẽ xác nhận giá cuối khi API sẵn sàng.
  Future<Order> placeOrder(Order order) {
    return orderService.placeOrder(order);
  }
}
