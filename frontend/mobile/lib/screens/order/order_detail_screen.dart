import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/theme.dart';
import '../../core/widgets/loading_state.dart';
import '../../providers/order_provider.dart';
import '../../utils/format.dart';

const _timeline = [
  ('PLACED', 'Đặt hàng', Icons.shopping_cart_outlined),
  ('CONFIRMED', 'Xác nhận', Icons.verified_outlined),
  ('PROCESSING', 'Đang xử lý', Icons.inventory_2_outlined),
  ('SHIPPING', 'Đang giao', Icons.local_shipping_outlined),
  ('DELIVERED', 'Đã giao', Icons.home_outlined),
  ('COMPLETED', 'Hoàn thành', Icons.star_outline),
];

const _statusToStep = {
  'CONFIRMED': 1,
  'PROCESSING': 2,
  'SHIPPING': 3,
  'DELIVERED': 4,
  'COMPLETED': 5,
};

class OrderDetailScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<OrderProvider>();
      if (provider.orders.isEmpty) {
        provider.loadOrders();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OrderProvider>();

    if (provider.loading && provider.orders.isEmpty) {
      return Scaffold(appBar: AppBar(), body: const LoadingState());
    }

    final order = provider.orders.firstWhere(
      (item) => item.id == widget.orderId,
      orElse: () => provider.orders.first,
    );

    final currentStep = _statusToStep[order.status] ?? 1;
    final cancellable = currentStep <= 2;

    return Scaffold(
      appBar: AppBar(title: Text('Đơn ${order.id}')),

      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          // Timeline
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
              child: Row(
                children: List.generate(_timeline.length, (index) {
                  final step = _timeline[index];
                  final done = index <= currentStep;

                  return Expanded(
                    child: Column(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: done ? AppColors.accent : AppColors.border,
                          ),
                          child: Icon(
                            step.$3,
                            size: 17,
                            color: done ? Colors.white : Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          step.$2,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: done
                                ? FontWeight.w700
                                : FontWeight.w400,
                            color: done
                                ? AppColors.textPrimary
                                : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),
          ),

          // Thông tin nhận hàng
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Thông tin nhận hàng',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  _InfoRow(label: 'Người nhận', value: order.customer),
                  _InfoRow(label: 'Điện thoại', value: order.phone),
                  _InfoRow(label: 'Địa chỉ', value: order.address),
                  _InfoRow(label: 'Thanh toán', value: order.paymentMethod),
                ],
              ),
            ),
          ),

          // Sản phẩm
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Sản phẩm',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  ...order.items.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: item.imageUrl != null
                                ? Image.network(
                                    item.imageUrl!,
                                    width: 48,
                                    height: 48,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        const SizedBox(
                                          width: 48,
                                          height: 48,
                                          child: ColoredBox(
                                            color: Color(0xFFFAFAFA),
                                          ),
                                        ),
                                  )
                                : const SizedBox(
                                    width: 48,
                                    height: 48,
                                    child: ColoredBox(color: Color(0xFFFAFAFA)),
                                  ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.productName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 13),
                                ),
                                if (item.variantName != null)
                                  Text(
                                    item.variantName!,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Text(
                            '${formatCurrency(item.unitPrice)} x${item.quantity}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Tổng kết
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _InfoRow(
                    label: 'Tạm tính',
                    value: formatCurrency(order.subtotal),
                  ),
                  if (order.discount > 0)
                    _InfoRow(
                      label: 'Giảm giá',
                      value: '-${formatCurrency(order.discount)}',
                      valueColor: AppColors.success,
                    ),
                  _InfoRow(
                    label: 'Phí vận chuyển',
                    value: order.shippingFee == 0
                        ? 'Miễn phí'
                        : formatCurrency(order.shippingFee),
                  ),
                  const Divider(height: 20),
                  Row(
                    children: [
                      const Text(
                        'Tổng tiền',
                        style: TextStyle(fontWeight: FontWeight.w700),
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

          // Actions
          Row(
            children: [
              if (cancellable)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Chức năng hủy đơn cần API backend'),
                        ),
                      );
                    },
                    child: const Text('Hủy đơn'),
                  ),
                ),
              if (cancellable) const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => context.go('/'),
                  child: const Text('Mua lại'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 95,
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
                color: valueColor ?? AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
