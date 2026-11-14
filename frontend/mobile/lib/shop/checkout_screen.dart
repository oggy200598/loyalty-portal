import '../common/api_client.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'cart_item.dart';
import 'order.dart';
import 'cart_provider.dart';
import 'order_provider.dart';
import 'order_service.dart';
import '../common/format.dart';
import '../accounts/address_book.dart';
import 'payment_actions.dart';

class CheckoutScreen extends StatefulWidget {
  final Set<String>? selectedKeys;
  final String? couponCode;
  const CheckoutScreen({super.key, this.selectedKeys, this.couponCode});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _coupon = TextEditingController();
  String _paymentMethod = 'COD';
  Map<String, dynamic>? _quote;
  String? _quotedItems;
  String? _error;
  bool _pricing = false;
  bool _placing = false;
  bool _momoEnabled = false;
  int _quoteVersion = 0;

  List<CartItem> get _items => context
      .read<CartProvider>()
      .items
      .where(
        (item) =>
            widget.selectedKeys == null ||
            widget.selectedKeys!.contains(
              '${item.productId}-${item.variantId ?? '-'}',
            ),
      )
      .toList();
  List<Map<String, dynamic>> _payload(List<CartItem> items) => items
      .map(
        (item) => <String, dynamic>{
          'productId': int.parse(item.productId),
          if (item.variantId != null) 'variantId': int.parse(item.variantId!),
          'quantity': item.quantity,
        },
      )
      .toList();
  String _signature(List<CartItem> items) =>
      jsonEncode([_payload(items), _coupon.text.trim()]);
  num _amount(String key) => num.tryParse(_quote?[key].toString() ?? '') ?? 0;

  @override
  void initState() {
    super.initState();
    _coupon.text = widget.couponCode ?? '';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _loadQuote();
        _loadPayments();
      }
    });
  }

  Future<void> _loadPayments() async {
    try {
      final enabled = await MomoPayments(
        context.read<OrderService>().client,
      ).available();
      if (mounted) setState(() => _momoEnabled = enabled);
    } catch (_) {
      /* COD vẫn dùng được khi cổng thanh toán chưa sẵn sàng. */
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _coupon.dispose();
    super.dispose();
  }

  Future<void> _loadQuote() async {
    final items = _items;
    if (items.isEmpty) return;
    final version = ++_quoteVersion;
    final signature = _signature(items);
    setState(() {
      _pricing = true;
      _quote = null;
      _error = null;
    });
    try {
      final quote = await context.read<OrderService>().quote(
        _payload(items),
        couponCode: _coupon.text.trim(),
      );
      if (!mounted || version != _quoteVersion) return;
      setState(() {
        _quote = quote;
        _quotedItems = signature;
      });
    } catch (error) {
      if (mounted && version == _quoteVersion) {
        setState(() => _error = errorMessage(error));
      }
    } finally {
      if (mounted && version == _quoteVersion) setState(() => _pricing = false);
    }
  }

  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate() || _quote == null) return;
    final items = _items;
    if (_quotedItems != _signature(items)) {
      await _loadQuote();
      return;
    }
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final provider = context.read<OrderProvider>();
      final cart = context.read<CartProvider>();
      final order = await provider.placeOrder(
        Order(
          id: '',
          customer: _name.text.trim(),
          phone: _phone.text.trim(),
          address: _address.text.trim(),
          paymentMethod: _paymentMethod,
          status: 'CONFIRMED',
          subtotal: _amount('subtotal'),
          discount: _amount('discount'),
          shippingFee: _amount('shippingFee'),
          total: _amount('total'),
          createdAt: DateTime.now(),
          items: items
              .map(
                (item) => OrderItem(
                  productId: item.productId,
                  variantId: item.variantId,
                  productName: item.productName,
                  variantName: item.variantName,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                ),
              )
              .toList(),
        ),
        couponCode: _coupon.text.trim(),
      );
      cart.forgetPurchased(items);
      cart.load().catchError((Object _) {});
      if (mounted) {
        context.go(
          Uri(
            path: '/order-success/${order.id}',
            queryParameters: {
              if (order.relatedOrderIds.isNotEmpty)
                'ids': order.relatedOrderIds.join(','),
            },
          ).toString(),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = errorMessage(error));
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watch<CartProvider>();
    final items = _items;
    if (items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Thanh toán')),
        body: const Center(child: Text('Không có sản phẩm để thanh toán')),
      );
    }
    final validQuote = _quote != null && _quotedItems == _signature(items);
    return Scaffold(
      appBar: AppBar(title: const Text('Thanh toán')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            AddressPicker(
              client: context.read<OrderService>().client,
              onSelect: (row, initial) {
                if (initial && _address.text.isNotEmpty) return;
                _name.text = row['receiver_name'];
                _phone.text = row['phone'];
                _address.text = addressText(row);
              },
            ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Người nhận'),
              validator: (value) => (value ?? '').trim().isEmpty
                  ? 'Nhập họ tên người nhận'
                  : null,
            ),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Số điện thoại'),
              validator: (value) =>
                  RegExp(r'^0\d{9}$').hasMatch((value ?? '').trim())
                  ? null
                  : 'Số điện thoại không hợp lệ',
            ),
            TextFormField(
              controller: _address,
              decoration: const InputDecoration(labelText: 'Địa chỉ'),
              validator: (value) => (value ?? '').trim().isEmpty
                  ? 'Nhập địa chỉ nhận hàng'
                  : null,
            ),
            const SizedBox(height: 16),
            ...items.map(
              (item) => ListTile(
                title: Text(item.productName),
                subtitle: Text('${item.variantName ?? ''} × ${item.quantity}'),
                trailing: Text(formatCurrency(item.subtotal)),
              ),
            ),
            TextField(
              controller: _coupon,
              decoration: const InputDecoration(labelText: 'Mã giảm giá'),
              onChanged: (_) => setState(() {
                _quoteVersion++;
                _quote = null;
                _pricing = false;
              }),
            ),
            TextButton(
              onPressed: _pricing || _placing ? null : _loadQuote,
              child: Text(
                _pricing ? 'Đang tính giá...' : 'Cập nhật giá và voucher',
              ),
            ),
            DropdownButtonFormField<String>(
              initialValue: _paymentMethod,
              decoration: const InputDecoration(labelText: 'Thanh toán'),
              items: [
                const DropdownMenuItem(
                  value: 'COD',
                  child: Text('Thanh toán khi nhận hàng'),
                ),
                if (_momoEnabled)
                  const DropdownMenuItem(
                    value: 'MOMO',
                    child: Text('Ví MoMo sandbox'),
                  ),
              ],
              onChanged: (value) {
                if (value != null) setState(() => _paymentMethod = value);
              },
            ),
            const SizedBox(height: 16),
            if (validQuote) ...[
              Text('Tạm tính: ${formatCurrency(_amount('subtotal'))}'),
              Text('Giảm giá: ${formatCurrency(_amount('discount'))}'),
              Text('Vận chuyển: ${formatCurrency(_amount('shippingFee'))}'),
              Text(
                'Tổng tiền: ${formatCurrency(_amount('total'))}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
              if ((_quote?['groups'] as List?)?.length case final int count
                  when count > 1)
                Text('Đơn hàng được tách thành $count đơn theo shop.'),
            ],
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: validQuote && !_placing && !_pricing
                  ? _placeOrder
                  : null,
              child: Text(_placing ? 'Đang đặt hàng...' : 'Đặt hàng'),
            ),
          ],
        ),
      ),
    );
  }
}
