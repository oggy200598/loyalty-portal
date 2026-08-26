import '../core/network/api_client.dart';
import '../core/storage/local_storage.dart';
import '../models/order.dart';

/// Quản lý đơn hàng.
///
/// Đã nối backend: POST /orders, GET /orders. Nếu API lỗi (mạng/server),
/// fallback về lưu cục bộ để không chặn luồng đặt hàng khi demo offline.
class OrderService {
  final ApiClient client;
  final LocalStorage storage;

  OrderService(this.client, this.storage);

  Future<List<Order>> getOrders() async {
    try {
      final data = await client.get('/orders');
      final list = data is List ? data : (data['data'] as List? ?? []);
      return list.whereType<Map<String, dynamic>>().map(_orderFromApi).toList();
    } catch (_) {
      final raw = await storage.getOrders();
      return raw.map(Order.fromJson).toList();
    }
  }

  Future<Order?> getOrderById(String id) async {
    try {
      final data = await client.get('/orders/$id');
      return _orderFromApi(data is Map<String, dynamic> ? data : {});
    } catch (_) {
      final orders = await getOrders();
      for (final order in orders) {
        if (order.id == id) return order;
      }
      return null;
    }
  }

  /// Gửi đơn lên POST /orders và dùng response của server làm chuẩn.
  Future<Order> placeOrder(Order order) async {
    try {
      final data = await client.post('/orders', _toApiPayload(order));
      final created = _orderFromApi(
        data is Map<String, dynamic> ? data : {},
        fallback: order,
      );

      // Lưu thêm bản local để xem offline.
      final orders = await getOrders();
      orders.insert(0, created);
      await storage.setOrders(orders.map((item) => item.toJson()).toList());

      return created;
    } catch (_) {
      // Fallback local khi backend chưa chạy / mất mạng.
      final orders = await getOrders();
      orders.insert(0, order);
      await storage.setOrders(orders.map((item) => item.toJson()).toList());
      return order;
    }
  }

  // ---- Mapping giữa payload API (snake_case Prisma) và model app ----

  Map<String, dynamic> _toApiPayload(Order order) => {
    'customerName': order.customer,
    'phone': order.phone,
    'address': order.address,
    'paymentMethod': order.paymentMethod,
    'subtotal': order.subtotal,
    'discount': order.discount,
    'shippingFee': order.shippingFee,
    'total': order.total,
    'items': order.items
        .map(
          (item) => {
            'productId': item.productId,
            'productName': item.productName,
            'variantName': item.variantName ?? '',
            'imageUrl': item.imageUrl ?? '',
            'unitPrice': item.unitPrice,
            'quantity': item.quantity,
          },
        )
        .toList(),
  };

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
      case 'MOMO':
        return 'MOMO';
      default:
        return null;
    }
  }
}
