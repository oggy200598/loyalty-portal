import '../common/api_client.dart';
import 'package:flutter/foundation.dart';

import 'order.dart';
import 'order_service.dart';

class OrderProvider extends ChangeNotifier {
  final OrderService orderService;

  List<Order> _orders = [];
  int page = 1;
  int totalPages = 0;
  String status = 'ALL';

  int _generation = 0;
  void clearMemory() {
    _generation++;
    _orders = [];
    page = 1;
    totalPages = 0;
    status = 'ALL';
    error = null;
    loading = false;
    notifyListeners();
  }

  bool loading = false;
  String? error;

  OrderProvider({required this.orderService});

  List<Order> get orders => List.unmodifiable(_orders);

  Future<void> loadOrders({int? requestedPage, String? requestedStatus}) async {
    final generation = ++_generation;
    final nextStatus = requestedStatus ?? status;
    final nextPage = requestedPage ?? (nextStatus == status ? page : 1);
    if (nextStatus != status || nextPage != page) _orders = [];
    status = nextStatus;
    page = nextPage;
    loading = true;
    error = null;
    notifyListeners();

    try {
      final result = await orderService.getOrders(page: page, status: status);
      if (generation != _generation) return;
      _orders = result.orders;
      totalPages = result.totalPages;
      if (page > totalPages && page > 1) {
        await loadOrders(requestedPage: totalPages > 0 ? totalPages : 1);
      }
    } catch (err) {
      if (generation == _generation) error = errorMessage(err);
    } finally {
      if (generation == _generation) {
        loading = false;
        notifyListeners();
      }
    }
  }

  /// Giá và trạng thái đơn hàng do backend xác nhận.
  Future<Order> placeOrder(Order order, {String? couponCode}) async {
    final generation = _generation;
    final created = await orderService.placeOrder(
      order,
      couponCode: couponCode,
    );
    if (generation == _generation) {
      await loadOrders(requestedPage: 1);
    }
    return created;
  }
}
