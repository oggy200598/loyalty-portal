class OrderItem {
  final String productId;
  final String? variantId;
  final String productName;
  final String? variantName;
  final String? imageUrl;
  final num unitPrice;
  final int quantity;

  const OrderItem({
    required this.productId,
    this.variantId,
    required this.productName,
    this.variantName,
    this.imageUrl,
    required this.unitPrice,
    required this.quantity,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId']?.toString() ?? '',
      variantId: json['variantId']?.toString(),
      productName: json['productName']?.toString() ?? '',
      variantName: json['variantName']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      unitPrice: num.tryParse(json['unitPrice'].toString()) ?? 0,
      quantity: int.tryParse(json['quantity'].toString()) ?? 1,
    );
  }
}

class OrderStatusEvent {
  final String status;
  final String? previousStatus;
  final DateTime? createdAt;
  OrderStatusEvent.fromJson(Map<String, dynamic> json)
    : status = '${json['new_status']}',
      previousStatus = json['old_status']?.toString(),
      createdAt = DateTime.tryParse('${json['created_at']}');
  Map<String, dynamic> toJson() => {
    'new_status': status,
    'old_status': previousStatus,
    'created_at': createdAt?.toIso8601String(),
  };
}

class Order {
  final String id;
  final String customer;
  final String phone;
  final String address;
  final String paymentMethod;
  final String status;
  final String paymentStatus;
  final List<String> relatedOrderIds;
  final List<OrderStatusEvent> history;
  final num subtotal;
  final num discount;
  final num shippingFee;
  final num total;
  final DateTime createdAt;
  final List<OrderItem> items;

  const Order({
    required this.id,
    required this.customer,
    required this.phone,
    required this.address,
    required this.paymentMethod,
    required this.status,
    this.paymentStatus = 'UNPAID',
    this.relatedOrderIds = const [],
    this.history = const [],
    required this.subtotal,
    required this.discount,
    required this.shippingFee,
    required this.total,
    required this.createdAt,
    required this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id']?.toString() ?? '',
      customer: json['customer']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      paymentMethod: json['paymentMethod']?.toString() ?? 'COD',
      status: json['status']?.toString() ?? 'CONFIRMED',
      paymentStatus: json['paymentStatus']?.toString() ?? 'UNPAID',
      history: (json['history'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map(OrderStatusEvent.fromJson)
          .toList(),
      subtotal: num.tryParse(json['subtotal'].toString()) ?? 0,
      discount: num.tryParse(json['discount'].toString()) ?? 0,
      shippingFee: num.tryParse(json['shippingFee'].toString()) ?? 0,
      total: num.tryParse(json['total'].toString()) ?? 0,
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      items: (json['items'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(OrderItem.fromJson)
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'customer': customer,
    'phone': phone,
    'address': address,
    'paymentMethod': paymentMethod,
    'status': status,
    'paymentStatus': paymentStatus,
    'history': history.map((event) => event.toJson()).toList(),
    'subtotal': subtotal,
    'discount': discount,
    'shippingFee': shippingFee,
    'total': total,
    'createdAt': createdAt.toIso8601String(),
    'items': items
        .map(
          (item) => {
            'productId': item.productId,
            'variantId': item.variantId,
            'productName': item.productName,
            'variantName': item.variantName,
            'imageUrl': item.imageUrl,
            'unitPrice': item.unitPrice,
            'quantity': item.quantity,
          },
        )
        .toList(),
  };
}
