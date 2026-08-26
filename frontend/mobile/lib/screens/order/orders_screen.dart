import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/theme.dart';
import '../../core/widgets/loading_state.dart';
import '../../providers/order_provider.dart';
import '../../utils/format.dart';

const _statusMeta = {
  'ALL': ('Tất cả', Color(0xFF666666)),
  'CONFIRMED': ('Chờ xác nhận', Color(0xFFF59E0B)),
  'PROCESSING': ('Đang xử lý', Color(0xFF3B82F6)),
  'SHIPPING': ('Đang giao', Color(0xFF8B5CF6)),
  'DELIVERED': ('Đã giao', Color(0xFF10B981)),
  'COMPLETED': ('Hoàn thành', Color(0xFF16A34A)),
  'CANCELLED': ('Đã hủy', Color(0xFFDC2626)),
};

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String _tab = 'ALL';

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

    final orders = _tab == 'ALL'
        ? provider.orders
        : provider.orders.where((order) => order.status == _tab).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Đơn hàng của tôi')),

      body: provider.loading && provider.orders.isEmpty
          ? const LoadingState(message: 'Đang tải đơn hàng...')
          : provider.error != null
          ? ErrorState(
              message: provider.error!,
              onRetry: () => provider.loadOrders(),
            )
          : Column(
              children: [
                // Tabs
                Container(
                  color: Colors.white,
                  height: 44,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    children: _statusMeta.entries.map((entry) {
                      final selected = _tab == entry.key;

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(entry.value.$1),
                          selected: selected,
                          onSelected: (_) => setState(() => _tab = entry.key),
                          selectedColor: AppColors.accent.withOpacity(.15),
                          labelStyle: TextStyle(
                            fontSize: 12.5,
                            color: selected
                                ? AppColors.accent
                                : AppColors.textPrimary,
                            fontWeight: selected
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                          shape: StadiumBorder(
                            side: BorderSide(
                              color: selected
                                  ? AppColors.accent
                                  : AppColors.border,
                            ),
                          ),
                          showCheckmark: false,
                        ),
                      );
                    }).toList(),
                  ),
                ),

                Expanded(
                  child: orders.isEmpty
                      ? const EmptyState(
                          icon: Icons.receipt_long,
                          message: 'Chưa có đơn hàng nào',
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: orders.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final order = orders[index];
                            final meta =
                                _statusMeta[order.status] ??
                                _statusMeta['ALL']!;

                            return Card(
                              child: InkWell(
                                onTap: () =>
                                    context.push('/orders/${order.id}'),
                                borderRadius: BorderRadius.circular(10),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            order.id,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13.5,
                                            ),
                                          ),
                                          const Spacer(),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              color: meta.$2.withOpacity(.12),
                                              borderRadius:
                                                  BorderRadius.circular(999),
                                            ),
                                            child: Text(
                                              meta.$1,
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: meta.$2,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      ...order.items
                                          .take(2)
                                          .map(
                                            (item) => Padding(
                                              padding: const EdgeInsets.only(
                                                bottom: 4,
                                              ),
                                              child: Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      '${item.productName} x${item.quantity}',
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: const TextStyle(
                                                        fontSize: 12.5,
                                                        color: AppColors
                                                            .textSecondary,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                      if (order.items.length > 2)
                                        Text(
                                          'và ${order.items.length - 2} sản phẩm khác',
                                          style: const TextStyle(
                                            fontSize: 11.5,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      const Divider(height: 16),
                                      Row(
                                        children: [
                                          Text(
                                            formatCurrency(order.total),
                                            style: const TextStyle(
                                              color: AppColors.accent,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 15,
                                            ),
                                          ),
                                          const Spacer(),
                                          const Text(
                                            'Xem chi tiết',
                                            style: TextStyle(
                                              fontSize: 12.5,
                                              color: AppColors.accent,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const Icon(
                                            Icons.chevron_right,
                                            size: 18,
                                            color: AppColors.accent,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
