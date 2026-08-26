import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/theme.dart';
import '../../providers/order_provider.dart';
import '../../utils/format.dart';

class OrderSuccessScreen extends StatefulWidget {
  final String orderId;

  const OrderSuccessScreen({
    super.key,
    required this.orderId,
  });

  @override
  State<OrderSuccessScreen> createState() =>
      _OrderSuccessScreenState();
}

class _OrderSuccessScreenState
    extends State<OrderSuccessScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OrderProvider>().loadOrders();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OrderProvider>();
    final order = provider.orders.firstWhere(
      (item) => item.id == widget.orderId,
      orElse: () => provider.orders.first,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Đặt hàng')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SizedBox(height: 16),

          // Icon thành công
          Center(
            child: Container(
              width: 88,
              height: 88,
              decoration: const BoxDecoration(
                color: Color(0xFFE8F7EE),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_rounded,
                size: 52,
                color: AppColors.success,
              ),
            ),
          ),

          const SizedBox(height: 16),

          const Center(
            child: Text(
              'Đặt hàng thành công!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),

          const SizedBox(height: 4),

          Center(
            child: Text(
              'Mã đơn hàng: ${widget.orderId}',
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13.5,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Thông tin đơn
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _Row(
                      label: 'Người nhận',
                      value: order.customer),
                  _Row(
                      label: 'Điện thoại',
                      value: order.phone),
                  _Row(
                      label: 'Địa chỉ',
                      value: order.address),
                  _Row(
                      label: 'Thanh toán',
                      value: order.paymentMethod),
                  const Divider(height: 20),
                  _Row(
                    label: 'Tạm tính',
                    value:
                        formatCurrency(order.subtotal),
                  ),
                  if (order.discount > 0)
                    _Row(
                      label: 'Giảm giá',
                      value:
                          '-${formatCurrency(order.discount)}',
                      valueColor: AppColors.success,
                    ),
                  _Row(
                    label: 'Phí vận chuyển',
                    value: order.shippingFee == 0
                        ? 'Miễn phí'
                        : formatCurrency(
                            order.shippingFee),
                  ),
                  const Divider(height: 20),
                  Row(
                    children: [
                      const Text(
                        'Tổng tiền',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        formatCurrency(order.total),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.accent,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          ElevatedButton(
            onPressed: () =>
                context.go('/orders/${order.id}'),
            child: const Text('Xem đơn hàng'),
          ),

          const SizedBox(height: 8),

          OutlinedButton(
            onPressed: () => context.go('/'),
            child: const Text('Tiếp tục mua sắm'),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _Row({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color:
                    valueColor ?? AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
