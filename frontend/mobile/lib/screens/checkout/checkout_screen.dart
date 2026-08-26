import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/theme.dart';
import '../../models/coupon.dart';
import '../../models/order.dart';
import '../../providers/cart_provider.dart';
import '../../providers/order_provider.dart';
import '../../utils/format.dart';

const _shippingFee = 25000;
const _freeShipThreshold = 500000;

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _noteController = TextEditingController();

  String _paymentMethod = 'COD';
  String _couponChoice = 'auto';
  bool _placing = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  /// Coupon khả dụng gom từ sản phẩm trong giỏ.
  List<Coupon> _availableCoupons(List items, num subtotal) {
    final map = <String, Coupon>{};

    for (final item in items) {
      final product = item.product;
      if (product == null) continue;

      for (final coupon in product.coupons) {
        final applicable = isCouponApplicable(
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderValue: coupon.minOrderValue,
          subtotal: subtotal,
        );

        if (applicable) {
          map.putIfAbsent(coupon.id, () => coupon);
        }
      }
    }

    return map.values.toList();
  }

  /// Chọn coupon giảm nhiều nhất (auto).
  Coupon? _bestCoupon(List<Coupon> coupons, num subtotal) {
    Coupon? best;
    num bestDiscount = -1;

    for (final coupon in coupons) {
      final discount = coupon.isFreeShip
          ? _shippingFee
          : calcCouponDiscount(
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              maxDiscount: coupon.maxDiscount,
              subtotal: subtotal,
            );

      if (discount > bestDiscount) {
        best = coupon;
        bestDiscount = discount;
      }
    }

    return best;
  }

  Coupon? _activeCoupon(List<Coupon> coupons, Coupon? best) {
    if (_couponChoice == 'none') return null;
    if (_couponChoice == 'auto') return best;

    for (final coupon in coupons) {
      if (coupon.id == _couponChoice) return coupon;
    }
    return null;
  }

  Future<void> _placeOrder(List items) async {
    if (!_formKey.currentState!.validate()) return;

    final cart = context.read<CartProvider>();
    final orderProvider = context.read<OrderProvider>();

    final subtotal = cart.subtotal;

    final coupons = _availableCoupons(items, subtotal);
    final best = _bestCoupon(coupons, subtotal);
    final active = _activeCoupon(coupons, best);

    final discount = active == null || active.isFreeShip
        ? 0
        : calcCouponDiscount(
            discountType: active.discountType,
            discountValue: active.discountValue,
            maxDiscount: active.maxDiscount,
            subtotal: subtotal,
          );

    final freeship =
        (active?.isFreeShip ?? false) || subtotal >= _freeShipThreshold;

    final shippingFee = freeship ? 0 : _shippingFee;
    final total = subtotal - discount + shippingFee;

    setState(() => _placing = true);

    try {
      final order = await orderProvider.placeOrder(
        Order(
          id: 'RM${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}',
          customer: _nameController.text.trim(),
          phone: _phoneController.text.trim(),
          address: _addressController.text.trim(),
          paymentMethod: _paymentMethod,
          status: 'CONFIRMED',
          subtotal: subtotal,
          discount: discount,
          shippingFee: shippingFee,
          total: total,
          createdAt: DateTime.now(),
          items: items
              .map(
                (item) => OrderItem(
                  productId: item.productId,
                  productName: item.productName,
                  variantName: item.variantName,
                  imageUrl: item.imageUrl,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                ),
              )
              .toList(),
        ),
      );

      await cart.clear();

      if (mounted) {
        context.go('/order-success/${order.id}');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đặt hàng thất bại: $error'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final items = cart.items;

    if (items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Thanh toán')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Không có sản phẩm để thanh toán'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/'),
                child: const Text('Tiếp tục mua sắm'),
              ),
            ],
          ),
        ),
      );
    }

    final subtotal = cart.subtotal;
    final coupons = _availableCoupons(items, subtotal);
    final best = _bestCoupon(coupons, subtotal);
    final active = _activeCoupon(coupons, best);

    final discount = active == null || active.isFreeShip
        ? 0
        : calcCouponDiscount(
            discountType: active.discountType,
            discountValue: active.discountValue,
            maxDiscount: active.maxDiscount,
            subtotal: subtotal,
          );

    final freeship =
        (active?.isFreeShip ?? false) || subtotal >= _freeShipThreshold;

    final shippingFee = freeship ? 0 : _shippingFee;
    final total = subtotal - discount + shippingFee;

    return Scaffold(
      appBar: AppBar(title: const Text('Thanh toán')),

      bottomNavigationBar: Container(
        color: Colors.white,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        child: SafeArea(
          top: false,
          child: ElevatedButton(
            onPressed: _placing ? null : () => _placeOrder(items),
            child: Text(
              _placing
                  ? 'Đang đặt hàng...'
                  : 'Đặt hàng · ${formatCurrency(total)}',
            ),
          ),
        ),
      ),

      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            // Địa chỉ nhận hàng
            _Section(
              title: 'Thông tin nhận hàng',
              icon: Icons.location_on_outlined,
              children: [
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    hintText: 'Họ tên người nhận',
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Vui lòng nhập họ tên'
                      : null,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: 'Số điện thoại (09xxxxxxxx)',
                  ),
                  validator: (value) {
                    final phone = (value ?? '').trim();
                    if (phone.isEmpty) {
                      return 'Vui lòng nhập số điện thoại';
                    }
                    if (!RegExp(r'^0\d{9}$').hasMatch(phone)) {
                      return 'Số điện thoại không hợp lệ';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    hintText: 'Địa chỉ chi tiết',
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Vui lòng nhập địa chỉ'
                      : null,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _noteController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'Ghi chú cho shop (tùy chọn)',
                  ),
                ),
              ],
            ),

            // Sản phẩm
            _Section(
              title: 'Sản phẩm (${items.length})',
              children: items.map((item) {
                return Padding(
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
                                errorBuilder: (_, __, ___) => const SizedBox(
                                  width: 48,
                                  height: 48,
                                  child: ColoredBox(color: Color(0xFFFAFAFA)),
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
                            Text(
                              'x${item.quantity}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        formatCurrency(item.subtotal),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.accent,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),

            // Voucher
            _Section(
              title: 'Voucher',
              icon: Icons.local_offer_outlined,
              children: [
                DropdownButtonFormField<String>(
                  value: _couponChoice,
                  isExpanded: true,
                  decoration: const InputDecoration(isDense: true),
                  items: [
                    DropdownMenuItem(
                      value: 'auto',
                      child: Text(
                        best == null
                            ? 'Tự động (không có voucher phù hợp)'
                            : 'Tự động: ${best.name}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const DropdownMenuItem(
                      value: 'none',
                      child: Text('Không dùng voucher'),
                    ),
                    ...coupons.map(
                      (coupon) => DropdownMenuItem(
                        value: coupon.id,
                        child: Text(
                          '${coupon.name} (${couponLabel(coupon.discountType, coupon.discountValue)})',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _couponChoice = value);
                    }
                  },
                ),
                if (active != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'Áp dụng: ${active.name}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),

            // Thanh toán
            _Section(
              title: 'Phương thức thanh toán',
              icon: Icons.payment_outlined,
              children: [
                ...[
                  (
                    'COD',
                    'Thanh toán khi nhận hàng',
                    Icons.local_shipping_outlined,
                  ),
                  (
                    'BANK',
                    'Chuyển khoản ngân hàng',
                    Icons.account_balance_outlined,
                  ),
                  ('MOMO', 'Ví MoMo', Icons.wallet_outlined),
                ].map(
                  (method) => RadioListTile<String>(
                    value: method.$1,
                    groupValue: _paymentMethod,
                    onChanged: (value) =>
                        setState(() => _paymentMethod = value!),
                    activeColor: AppColors.accent,
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Row(
                      children: [
                        Icon(method.$3, size: 20, color: AppColors.accent),
                        const SizedBox(width: 8),
                        Text(method.$2, style: const TextStyle(fontSize: 13.5)),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Tổng kết
            _Section(
              title: 'Tổng kết',
              children: [
                _SummaryRow(label: 'Tạm tính', value: formatCurrency(subtotal)),
                _SummaryRow(
                  label: 'Giảm giá',
                  value: discount > 0 ? '-${formatCurrency(discount)}' : '0₫',
                  valueColor: discount > 0 ? AppColors.success : null,
                ),
                _SummaryRow(
                  label: 'Phí vận chuyển',
                  value: freeship ? 'Miễn phí' : formatCurrency(shippingFee),
                  valueColor: freeship ? AppColors.success : null,
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
                      formatCurrency(total),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.accent,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Tổng tiền cuối cùng được hệ thống xác nhận.',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final IconData? icon;
  final List<Widget> children;

  const _Section({required this.title, this.icon, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: AppColors.accent),
                  const SizedBox(width: 6),
                ],
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: valueColor ?? AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
