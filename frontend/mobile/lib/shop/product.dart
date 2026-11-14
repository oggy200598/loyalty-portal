class Shop {
  final String id;
  final String name;
  final String? logoUrl;

  const Shop({required this.id, required this.name, this.logoUrl});

  factory Shop.fromJson(Map<String, dynamic> json) {
    return Shop(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      logoUrl: json['logoUrl']?.toString(),
    );
  }
}

class ProductCategory {
  final String id;
  final String name;
  final String? parentId;

  const ProductCategory({required this.id, required this.name, this.parentId});

  factory ProductCategory.fromJson(Map<String, dynamic> json) {
    return ProductCategory(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      parentId: json['parentId']?.toString(),
    );
  }
}

class ProductImage {
  final String id;
  final String imageUrl;
  final bool isPrimary;

  const ProductImage({
    required this.id,
    required this.imageUrl,
    this.isPrimary = false,
  });

  factory ProductImage.fromJson(Map<String, dynamic> json) {
    return ProductImage(
      id: json['id']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? '',
      isPrimary: json['isPrimary'] == true,
    );
  }
}

class ProductVariant {
  final String id;
  final String variantName;
  final num price;
  final int stockQuantity;

  const ProductVariant({
    required this.id,
    required this.variantName,
    required this.price,
    required this.stockQuantity,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id']?.toString() ?? '',
      variantName:
          json['variantName']?.toString() ?? json['name']?.toString() ?? '',
      price: num.tryParse(json['price'].toString()) ?? 0,
      stockQuantity: int.tryParse(json['stockQuantity'].toString()) ?? 0,
    );
  }
}

class Coupon {
  final String id;
  final String? code;
  final String name;

  /// PERCENT | FIXED | FREE_SHIP
  final String discountType;
  final num? discountValue;
  final num minOrderValue;
  final num? maxDiscount;

  const Coupon({
    required this.id,
    this.code,
    required this.name,
    required this.discountType,
    this.discountValue,
    this.minOrderValue = 0,
    this.maxDiscount,
  });

  factory Coupon.fromJson(Map<String, dynamic> json) {
    return Coupon(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString(),
      name: json['name']?.toString() ?? '',
      discountType: json['discountType']?.toString() ?? 'PERCENT',
      discountValue: json['discountValue'] == null
          ? null
          : num.tryParse(json['discountValue'].toString()),
      minOrderValue: num.tryParse(json['minOrderValue'].toString()) ?? 0,
      maxDiscount: json['maxDiscount'] == null
          ? null
          : num.tryParse(json['maxDiscount'].toString()),
    );
  }

  bool get isFreeShip => discountType == 'FREE_SHIP';
}

class Product {
  final String id;
  final String name;
  final String? description;
  final num price;
  final int stockQuantity;
  final int soldQuantity;
  final Shop? shop;
  final ProductCategory? category;
  final List<ProductImage> images;
  final List<ProductVariant> variants;
  final List<Coupon> coupons;

  const Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    required this.stockQuantity,
    required this.soldQuantity,
    this.shop,
    this.category,
    this.images = const [],
    this.variants = const [],
    this.coupons = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      price: num.tryParse(json['price'].toString()) ?? 0,
      stockQuantity: int.tryParse(json['stockQuantity'].toString()) ?? 0,
      soldQuantity: int.tryParse(json['soldQuantity'].toString()) ?? 0,
      shop: json['shop'] is Map ? Shop.fromJson(json['shop']) : null,
      category: json['category'] is Map
          ? ProductCategory.fromJson(json['category'])
          : null,
      images: (json['images'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductImage.fromJson)
          .toList(),
      variants: (json['variants'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductVariant.fromJson)
          .toList(),
      coupons: (json['coupons'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Coupon.fromJson)
          .toList(),
    );
  }

  String? get primaryImageUrl {
    for (final image in images) {
      if (image.isPrimary) return image.imageUrl;
    }
    return images.isEmpty ? null : images.first.imageUrl;
  }

  bool get inStock => stockQuantity > 0;
}
