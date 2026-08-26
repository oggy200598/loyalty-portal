class OrderItem {
  final String productId;
  final String productName;
  final String? variantName;
  final String? imageUrl;
  final num unitPrice;
  final int quantity;

  const OrderItem({
    required this.productId,
    required this.productName,
    this.variantName,
    this.imageUrl,
    required this.unitPrice,
    required this.quantity,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId']?.toString() ?? '',
      productName:
          json['productName']?.toString() ?? '',
      variantName: json['variantName']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      unitPrice:
          num.tryParse(json['unitPrice'].toString()) ?? 0,
      quantity: int.tryParse(json['quantity'].toString()) ?? 1,
    );
  }
}

class Order {
  final String id;
  final String customer;
  final String phone;
  final String address;
  final String paymentMethod;
  final String status;
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
      paymentMethod:
          json['paymentMethod']?.toString() ?? 'COD',
      status: json['status']?.toString() ?? 'CONFIRMED',
      subtotal:
          num.tryParse(json['subtotal'].toString()) ?? 0,
      discount:
          num.tryParse(json['discount'].toString()) ?? 0,
      shippingFee:
          num.tryParse(json['shippingFee'].toString()) ?? 0,
      total: num.tryParse(json['total'].toString()) ?? 0,
      createdAt: DateTime.tryParse(
            json['createdAt']?.toString() ?? '',
          ) ??
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
        'subtotal': subtotal,
        'discount': discount,
        'shippingFee': shippingFee,
        'total': total,
        'createdAt': createdAt.toIso8601String(),
        'items': items
            .map((item) => {
                  'productId': item.productId,
                  'productName': item.productName,
                  'variantName': item.variantName,
                  'imageUrl': item.imageUrl,
                  'unitPrice': item.unitPrice,
                  'quantity': item.quantity,
                })
            .toList(),
      };
}
