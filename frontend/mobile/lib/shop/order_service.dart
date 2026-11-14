import '../common/api_client.dart';
import 'order.dart';

/// Quản lý đơn hàng.
///
/// Chỉ trả thành công khi backend đã xác nhận đơn hàng.
class OrderService {
  final ApiClient client;

  OrderService(this.client);

  Future<List<Order>> getOrders() async {
    final data = await client.get('/orders');
    final list = data is List ? data : (data['data'] as List? ?? []);
    return list.whereType<Map<String, dynamic>>().map(_orderFromApi).toList();
  }

  Future<Order?> getOrderById(String id) async {
    final data = await client.get('/orders/$id');
    return _orderFromApi(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> quote(
    List<Map<String, dynamic>> items, {
    String? couponCode,
  }) async {
    final data = await client.post('/orders/quote', {
      'items': items,
      if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
    });
    return data as Map<String, dynamic>;
  }

  Future<Order> placeOrder(Order order, {String? couponCode}) async {
    final data = await client.post('/orders', {
      'customerName': order.customer,
      'phone': order.phone,
      'address': order.address,
      'paymentMethod': order.paymentMethod,
      'expectedTotal': order.total,
      if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      'items': order.items
          .map(
            (item) => {
              'productId': int.parse(item.productId),
              if (item.variantId != null)
                'variantId': int.parse(item.variantId!),
              'quantity': item.quantity,
            },
          )
          .toList(),
    });
    if (data is! Map<String, dynamic> || data['id'] == null) {
      throw const ApiException('Máy chủ chưa xác nhận đơn hàng');
    }
    return _orderFromApi(data);
  }

  Order _orderFromApi(Map<String, dynamic> json, {Order? fallback}) {
    if (json.isEmpty && fallback != null) return fallback;

    final itemsRaw =
        json['order_items'] as List<dynamic>? ??
        json['items'] as List<dynamic>? ??
        [];

    return Order(
      id: (json['id'] ?? json['order_code'])?.toString() ?? fallback?.id ?? '',
      customer:
          (json['shipping_receiver_name'] ?? json['customer'])?.toString() ??
          fallback?.customer ??
          '',
      phone:
          (json['shipping_phone'] ?? json['phone'])?.toString() ??
          fallback?.phone ??
          '',
      address:
          (json['shipping_address_detail'] ?? json['address'])?.toString() ??
          fallback?.address ??
          '',
      paymentMethod:
          _mapPaymentMethod(
            (json['payments'] as List?)?.firstOrNull?['method']?.toString(),
          ) ??
          fallback?.paymentMethod ??
          'COD',
      status: json['status']?.toString() ?? fallback?.status ?? 'CONFIRMED',
      paymentStatus:
          json['payment_status']?.toString() ??
          fallback?.paymentStatus ??
          'UNPAID',
      history: (json['order_status_history'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map(OrderStatusEvent.fromJson)
          .toList(),
      relatedOrderIds: (json['orders'] as List? ?? [])
          .map((row) => '${row['id']}')
          .toList(),
      subtotal:
          num.tryParse(json['subtotal'].toString()) ?? fallback?.subtotal ?? 0,
      discount:
          num.tryParse(json['discount_amount'].toString()) ??
          fallback?.discount ??
          0,
      shippingFee:
          num.tryParse(json['shipping_fee'].toString()) ??
          fallback?.shippingFee ??
          0,
      total:
          num.tryParse(json['total_amount'].toString()) ?? fallback?.total ?? 0,
      createdAt:
          DateTime.tryParse(json['created_at'].toString()) ??
          fallback?.createdAt ??
          DateTime.now(),
      items: itemsRaw
          .whereType<Map<String, dynamic>>()
          .map(
            (item) => OrderItem(
              productId: item['product_id']?.toString() ?? '',
              productName: item['product_name']?.toString() ?? '',
              variantId: item['variant_id']?.toString(),
              variantName: null,
              imageUrl: null,
              unitPrice: num.tryParse(item['unit_price'].toString()) ?? 0,
              quantity: int.tryParse(item['quantity'].toString()) ?? 1,
            ),
          )
          .toList(),
    );
  }

  String? _mapPaymentMethod(String? method) {
    switch (method) {
      case 'COD':
        return 'COD';
      case 'BANK_TRANSFER':
        return 'BANK';
      case 'E_WALLET':
        return 'MOMO';
      default:
        return null;
    }
  }
}
