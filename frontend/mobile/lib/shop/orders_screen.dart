import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../common/theme.dart';
import '../common/loading_state.dart';
import 'order_provider.dart';
import '../common/format.dart';

const _statusMeta = {
  'ALL': AppColors.textSecondary,
  'PENDING': AppColors.warning,
  'CONFIRMED': AppColors.warning,
  'PROCESSING': Color(0xFF3B82F6),
  'SHIPPING': Color(0xFF8B5CF6),
  'DELIVERED': AppColors.success,
  'COMPLETED': AppColors.success,
  'CANCELLED': AppColors.danger,
  'RETURNED': AppColors.danger,
  'FAILED': AppColors.danger,
  'NON_RECEIVED': AppColors.danger,
};

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<OrderProvider>().loadOrders(requestedPage: 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OrderProvider>();

    final orders = provider.orders;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn hàng của tôi'),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            onPressed: provider.loading ? null : () => provider.loadOrders(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),

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
                      final selected = provider.status == entry.key;

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(
                            entry.key == 'ALL'
                                ? 'Tất cả'
                                : valueLabel(entry.key),
                          ),
                          selected: selected,
                          onSelected: provider.loading
                              ? null
                              : (_) => provider.loadOrders(
                                  requestedPage: 1,
                                  requestedStatus: entry.key,
                                ),
                          selectedColor: AppColors.accent.withValues(
                            alpha: .15,
                          ),
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
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
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
                                              color: meta.withValues(
                                                alpha: .12,
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(999),
                                            ),
                                            child: Text(
                                              valueLabel(order.status),
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: meta,
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
                if (provider.totalPages > 1)
                  SafeArea(
                    top: false,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          tooltip: 'Trang trước',
                          onPressed: provider.loading || provider.page <= 1
                              ? null
                              : () => provider.loadOrders(
                                  requestedPage: provider.page - 1,
                                ),
                          icon: const Icon(Icons.chevron_left),
                        ),
                        Text('Trang ${provider.page} / ${provider.totalPages}'),
                        IconButton(
                          tooltip: 'Trang sau',
                          onPressed:
                              provider.loading ||
                                  provider.page >= provider.totalPages
                              ? null
                              : () => provider.loadOrders(
                                  requestedPage: provider.page + 1,
                                ),
                          icon: const Icon(Icons.chevron_right),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}
