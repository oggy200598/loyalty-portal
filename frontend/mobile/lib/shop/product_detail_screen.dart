import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../common/theme.dart';
import '../common/api_client.dart';
import '../common/loading_state.dart';
import 'cart_item.dart';
import 'product.dart';
import 'cart_provider.dart';
import 'product_provider.dart';
import '../accounts/wishlist_service.dart';
import '../common/format.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late Future<Product> _future;
  Product? _product;

  int _activeImage = 0;
  ProductVariant? _selectedVariant;
  int _quantity = 1;
  bool _wishlisted = false;
  bool _wishlistLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final provider = context.read<ProductProvider>();
    _future = provider.getProductDetail(widget.productId);
    _loadWishlistState();
  }

  Future<void> _loadWishlistState() async {
    try {
      final client = context.read<ApiClient>();
      final ids = await WishlistService(client).fetchIds();
      if (!mounted) return;
      setState(() => _wishlisted = ids.contains(widget.productId));
    } catch (_) {
      // chưa đăng nhập / lỗi mạng — bỏ qua
    }
  }

  Future<void> _toggleWishlist() async {
    if (_wishlistLoading) return;
    setState(() => _wishlistLoading = true);
    try {
      final client = context.read<ApiClient>();
      final service = WishlistService(client);
      if (_wishlisted) {
        await service.remove(widget.productId);
      } else {
        await service.add(widget.productId);
      }
      if (!mounted) return;
      setState(() => _wishlisted = !_wishlisted);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _wishlisted ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích',
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng đăng nhập để dùng yêu thích')),
      );
    } finally {
      if (mounted) setState(() => _wishlistLoading = false);
    }
  }

  String _formatPrice(num value) => formatCurrency(value);

  Future<void> _addToCart({bool buyNow = false}) async {
    final product = _product;
    if (product == null) return;

    // Bắt buộc chọn variant nếu sản phẩm có variant.
    if (product.variants.isNotEmpty && _selectedVariant == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn phân loại hàng')),
      );
      return;
    }

    final cart = context.read<CartProvider>();

    await cart.add(
      CartItem.fromProduct(
        product: product,
        variant: _selectedVariant,
        quantity: _quantity,
      ),
    );

    if (!mounted) return;

    if (buyNow) {
      context.go('/cart');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Đã thêm vào giỏ hàng'),
          backgroundColor: AppColors.success,
          action: SnackBarAction(
            label: 'Xem giỏ hàng',
            textColor: Colors.white,
            onPressed: () => context.push('/cart'),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết')),

      bottomNavigationBar: _buildBottomBar(),

      body: FutureBuilder<Product>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingState();
          }

          if (snapshot.hasError) {
            return ErrorState(
              message: 'Không thể tải sản phẩm. ${snapshot.error}',
              onRetry: () => setState(() => _load()),
            );
          }

          final product = snapshot.data!;
          if (_product?.id != product.id) {
            _product = product;
            _selectedVariant = product.variants.isEmpty
                ? null
                : product.variants.first;
          }

          final activePrice = _selectedVariant?.price ?? product.price;
          final activeStock =
              _selectedVariant?.stockQuantity ?? product.stockQuantity;

          return ListView(
            padding: const EdgeInsets.only(bottom: 16),
            children: [
              _buildGallery(product),

              // Tên + giá + sold
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        height: 1.4,
                      ),
                    ),

                    const SizedBox(height: 8),

                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          _formatPrice(activePrice),
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppColors.accent,
                          ),
                        ),

                        const Spacer(),

                        Text(
                          '${product.soldQuantity} đã bán',
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // Coupons
              if (product.coupons.isNotEmpty)
                CouponRow(coupons: product.coupons),

              // Shop + category
              Container(
                color: Colors.white,
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppColors.accent,
                      child: Text(
                        (product.shop?.name ?? 'S').isNotEmpty
                            ? product.shop!.name[0].toUpperCase()
                            : 'S',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.shop?.name ?? 'Không rõ shop',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            product.category?.name ?? '',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Variants
              if (product.variants.isNotEmpty)
                Container(
                  color: Colors.white,
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Phân loại hàng',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: product.variants.map((variant) {
                          final selected = variant.id == _selectedVariant?.id;

                          final outOfStock = variant.stockQuantity <= 0;

                          return ChoiceChip(
                            label: Text(
                              '${variant.variantName}'
                              '${outOfStock ? ' (hết)' : ''}',
                            ),
                            selected: selected,
                            onSelected: outOfStock
                                ? null
                                : (_) => setState(() {
                                    _selectedVariant = variant;
                                    _quantity = 1;
                                  }),
                            selectedColor: AppColors.accent.withValues(
                              alpha: .15,
                            ),
                            labelStyle: TextStyle(
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
                          );
                        }).toList(),
                      ),

                      const SizedBox(height: 14),

                      // Quantity selector — không vượt stock
                      Row(
                        children: [
                          const Text('Số lượng'),
                          const Spacer(),
                          IconButton(
                            onPressed: _quantity > 1
                                ? () => setState(() => _quantity--)
                                : null,
                            icon: const Icon(Icons.remove_circle_outline),
                          ),
                          Text('$_quantity'),
                          IconButton(
                            onPressed: _quantity < activeStock
                                ? () => setState(() => _quantity++)
                                : null,
                            icon: const Icon(Icons.add_circle_outline),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '$activeStock còn lại',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              // Description
              Container(
                color: Colors.white,
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Chi tiết sản phẩm',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      product.description ?? 'Chưa có mô tả.',
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildGallery(Product product) {
    final images = product.images;

    return Column(
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: images.isEmpty
              ? const ColoredBox(
                  color: Color(0xFFFAFAFA),
                  child: Center(
                    child: Icon(
                      Icons.image_outlined,
                      size: 56,
                      color: Colors.grey,
                    ),
                  ),
                )
              : PageView.builder(
                  itemCount: images.length,
                  onPageChanged: (index) =>
                      setState(() => _activeImage = index),
                  itemBuilder: (_, index) => Image.network(
                    images[index].imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const ColoredBox(
                      color: Color(0xFFFAFAFA),
                      child: Center(
                        child: Icon(Icons.broken_image, color: Colors.grey),
                      ),
                    ),
                  ),
                ),
        ),

        if (images.length > 1)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                images.length,
                (index) => Container(
                  width: 7,
                  height: 7,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: index == _activeImage
                        ? AppColors.accent
                        : AppColors.border,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildBottomBar() {
    final product = _product;
    final inStock =
        product != null &&
        (_selectedVariant?.stockQuantity ?? product.stockQuantity) > 0;

    return SafeArea(
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            InkWell(
              onTap: _toggleWishlist,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _wishlisted ? Icons.favorite : Icons.favorite_border,
                    size: 22,
                    color: _wishlisted ? const Color(0xFFee4d2d) : null,
                  ),
                  Text('Yêu thích', style: TextStyle(fontSize: 10)),
                ],
              ),
            ),

            const SizedBox(width: 12),

            Expanded(
              child: OutlinedButton(
                onPressed: inStock ? () => _addToCart() : null,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(44),
                ),
                child: const Text('Thêm vào giỏ'),
              ),
            ),

            const SizedBox(width: 8),

            Expanded(
              child: ElevatedButton(
                onPressed: inStock ? () => _addToCart(buyNow: true) : null,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(44),
                ),
                child: Text(inStock ? 'Mua ngay' : 'Hết hàng'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CouponRow extends StatelessWidget {
  final List<Coupon> coupons;

  const CouponRow({super.key, required this.coupons});

  String _label(Coupon coupon) {
    if (coupon.isFreeShip) return 'FREESHIP';
    if (coupon.discountType == 'PERCENT') {
      return 'Giảm ${coupon.discountValue}%';
    }
    return 'Giảm ${coupon.discountValue?.round() ?? 0}₫';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Ưu đãi', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: coupons.map((coupon) {
              final isShip = coupon.isFreeShip;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isShip ? const Color(0xFF02B2FA) : AppColors.accent,
                  ),
                  borderRadius: BorderRadius.circular(4),
                  color: isShip
                      ? const Color(0xFFF0FBFF)
                      : const Color(0xFFFFF5F2),
                ),
                child: Text(
                  _label(coupon),
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: isShip ? const Color(0xFF02B2FA) : AppColors.accent,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
