import 'product.dart';

/// Một dòng trong giỏ hàng (lưu cục bộ trên thiết bị).
class CartItem {
  final String productId;
  final String? variantId;
  final String productName;
  final String? variantName;
  final String? imageUrl;
  final num unitPrice;
  final int quantity;
  final int stockQuantity;

  /// ID dòng giỏ hàng trên backend (null khi item chỉ nằm local).
  final num? apiItemId;

  const CartItem({
    required this.productId,
    this.variantId,
    required this.productName,
    this.variantName,
    this.imageUrl,
    required this.unitPrice,
    required this.quantity,
    required this.stockQuantity,
    this.apiItemId,
  });

  num get subtotal => unitPrice * quantity;

  CartItem copyWith({int? quantity}) {
    return CartItem(
      productId: productId,
      variantId: variantId,
      productName: productName,
      variantName: variantName,
      imageUrl: imageUrl,
      unitPrice: unitPrice,
      quantity: quantity ?? this.quantity,
      stockQuantity: stockQuantity,
    );
  }

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'variantId': variantId,
    'productName': productName,
    'variantName': variantName,
    'imageUrl': imageUrl,
    'unitPrice': unitPrice,
    'quantity': quantity,
    'stockQuantity': stockQuantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      productId: json['productId']?.toString() ?? '',
      variantId: json['variantId']?.toString(),
      productName: json['productName']?.toString() ?? '',
      variantName: json['variantName']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      unitPrice: num.tryParse(json['unitPrice'].toString()) ?? 0,
      quantity: int.tryParse(json['quantity'].toString()) ?? 1,
      stockQuantity: int.tryParse(json['stockQuantity'].toString()) ?? 0,
    );
  }

  /// Tạo từ Product + variant đã chọn ở Product Detail.
  factory CartItem.fromProduct({
    required Product product,
    ProductVariant? variant,
    required int quantity,
  }) {
    return CartItem(
      productId: product.id,
      variantId: variant?.id,
      productName: product.name,
      variantName: variant?.variantName,
      imageUrl: product.primaryImageUrl,
      unitPrice: variant?.price ?? product.price,
      quantity: quantity,
      stockQuantity: variant?.stockQuantity ?? product.stockQuantity,
    );
  }
}
