import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../common/format.dart';
import 'order.dart';
import 'order_service.dart';
import 'payment_actions.dart';

class OrderSuccessScreen extends StatefulWidget {
  final String orderId;
  final List<String> relatedIds;
  const OrderSuccessScreen({
    super.key,
    required this.orderId,
    this.relatedIds = const [],
  });
  @override
  State<OrderSuccessScreen> createState() => _OrderSuccessScreenState();
}

class _OrderSuccessScreenState extends State<OrderSuccessScreen> {
  final Map<String, Order> _orders = {};
  final Map<String, String> _errors = {};
  bool _loading = true;
  int _generation = 0;
  List<String> get ids =>
      {widget.orderId, ...widget.relatedIds}.take(100).toList();
  OrderService get service => context.read<OrderService>();
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant OrderSuccessScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.orderId != widget.orderId) {
      _orders.clear();
      _errors.clear();
      _load();
    }
  }

  Future<void> _load() async {
    final generation = ++_generation;
    setState(() => _loading = true);
    await Future.wait(ids.map((id) => _refresh(id, generation)));
    if (mounted && generation == _generation) setState(() => _loading = false);
  }

  Future<void> _refresh(String id, int generation) async {
    try {
      if (!RegExp(r'^[1-9][0-9]*$').hasMatch(id)) {
        throw Exception('Mã đơn không hợp lệ');
      }
      final order = await service.getOrderById(id);
      if (order == null) throw Exception('Không tìm thấy đơn hàng');
      if (mounted && generation == _generation) {
        setState(() {
          _orders[id] = order;
          _errors.remove(id);
        });
      }
    } catch (e) {
      if (mounted && generation == _generation) {
        setState(() {
          _orders.remove(id);
          _errors[id] = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Đơn hàng vừa tạo'),
      actions: [
        IconButton(
          tooltip: 'Tải lại',
          onPressed: _loading ? null : _load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_loading) const LinearProgressIndicator(),
        Text(
          ids.length > 1
              ? 'Đơn được tách thành ${ids.length} đơn theo shop.'
              : 'Thông tin đơn hàng',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const Text('Kiểm tra trạng thái và hoàn tất thanh toán cho từng đơn.'),
        const SizedBox(height: 16),
        for (final id in ids)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Đơn #$id',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  if (_errors[id] != null)
                    Text(
                      _errors[id]!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  if (_orders[id] case final Order order) ...[
                    Text('${order.customer} · ${order.phone}'),
                    Text(order.address),
                    Text('Tổng tiền: ${formatCurrency(order.total)}'),
                    OrderPaymentPanel(
                      key: ValueKey(id),
                      order: order,
                      payments: MomoPayments(service.client),
                      onRefresh: () => _refresh(id, _generation),
                    ),
                    TextButton(
                      onPressed: () => context.push('/orders/$id'),
                      child: const Text('Xem chi tiết đơn'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        FilledButton(
          onPressed: () => context.go('/orders'),
          child: const Text('Xem tất cả đơn hàng'),
        ),
        TextButton(
          onPressed: () => context.go('/'),
          child: const Text('Tiếp tục mua sắm'),
        ),
      ],
    ),
  );
}
