import '../common/api_client.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../common/format.dart';
import 'order.dart';
import 'order_service.dart';
import 'payment_actions.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});
  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Order? _order;
  bool _loading = true, _acting = false;
  String? _error;
  int _generation = 0;
  OrderService get service => context.read<OrderService>();
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant OrderDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.orderId != widget.orderId) {
      _order = null;
      _load();
    }
  }

  Future<void> _load() async {
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (!RegExp(r'^[1-9][0-9]*$').hasMatch(widget.orderId)) {
        throw Exception('Mã đơn không hợp lệ');
      }
      final order = await service.getOrderById(widget.orderId);
      if (mounted && generation == _generation) setState(() => _order = order);
    } catch (e) {
      if (mounted && generation == _generation) {
        setState(() {
          _error = errorMessage(e);
          _order = null;
        });
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _cancel() async {
    final order = _order!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy đơn hàng?'),
        content: const Text('Lượng hàng đã giữ sẽ được trả về kho.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Giữ đơn'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hủy đơn'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _acting = true;
      _error = null;
    });
    try {
      await service.client.post('/orders/${order.id}/cancel', {
        'expectedStatus': order.status,
      });
      if (mounted) await _load();
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const statuses = {
      'PENDING': 'Chờ xác nhận',
      'CONFIRMED': 'Đã xác nhận',
      'PROCESSING': 'Đang chuẩn bị',
      'SHIPPING': 'Đang giao',
      'DELIVERED': 'Đã giao',
      'COMPLETED': 'Hoàn tất',
      'CANCELLED': 'Đã hủy',
      'RETURNED': 'Đã trả hàng',
      'FAILED': 'Giao thất bại',
      'NON_RECEIVED': 'Không nhận hàng',
    };
    final order = _order;
    return Scaffold(
      appBar: AppBar(
        title: Text('Đơn #${widget.orderId}'),
        actions: [
          IconButton(
            tooltip: 'Tải lại',
            onPressed: _loading || _acting ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading) const LinearProgressIndicator(),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            if (!_loading && order == null && _error == null)
              const Text('Không tìm thấy đơn hàng.'),
            if (order != null) ...[
              Text(
                statuses[order.status] ?? order.status,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text('${order.customer} · ${order.phone}'),
              Text(order.address),
              if (order.history.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Lịch sử đơn hàng',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                for (final event in order.history)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.history),
                    title: Text(
                      '${statuses[event.previousStatus] ?? 'Tạo đơn'} → ${statuses[event.status] ?? event.status}',
                    ),
                    subtitle: event.createdAt == null
                        ? null
                        : Text('${event.createdAt!.toLocal()}'),
                  ),
              ],
              const Divider(),
              for (final item in order.items)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.productName),
                  subtitle: Text(
                    '${item.quantity} × ${formatCurrency(item.unitPrice)}',
                  ),
                ),
              Text('Tạm tính: ${formatCurrency(order.subtotal)}'),
              Text('Giảm giá: ${formatCurrency(order.discount)}'),
              Text('Vận chuyển: ${formatCurrency(order.shippingFee)}'),
              Text(
                'Tổng tiền: ${formatCurrency(order.total)}',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              OrderPaymentPanel(
                key: ValueKey(order.id),
                order: order,
                payments: MomoPayments(service.client),
                onRefresh: _load,
              ),
              if (['PENDING', 'CONFIRMED'].contains(order.status) &&
                  order.paymentStatus == 'UNPAID')
                OutlinedButton(
                  onPressed: _acting || _loading ? null : _cancel,
                  child: const Text('Hủy đơn'),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
