import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../common/theme.dart';
import '../common/loading_state.dart';
import 'product.dart';
import 'product_provider.dart';
import 'product_card.dart';

/// Danh sách sản phẩm theo danh mục + sort/filter.
class CategoryProductsScreen extends StatefulWidget {
  final String categoryId;
  final String? categoryName;

  const CategoryProductsScreen({
    super.key,
    required this.categoryId,
    this.categoryName,
  });

  @override
  State<CategoryProductsScreen> createState() => _CategoryProductsScreenState();
}

class _CategoryProductsScreenState extends State<CategoryProductsScreen> {
  late Future<List<Product>> _future;

  List<Product> _products = [];
  String _sort = 'relevant';
  bool _inStockOnly = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _future = context.read<ProductProvider>().getProductsByCategory(
        widget.categoryId,
      );
    });
  }

  List<Product> get _visible {
    var list = _products;

    if (_inStockOnly) {
      list = list.where((item) => item.inStock).toList();
    }

    switch (_sort) {
      case 'price-asc':
        list = [...list]..sort((a, b) => a.price.compareTo(b.price));
        break;
      case 'price-desc':
        list = [...list]..sort((a, b) => b.price.compareTo(a.price));
        break;
      case 'best-seller':
        list = [...list]
          ..sort((a, b) => b.soldQuantity.compareTo(a.soldQuantity));
        break;
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.categoryName ?? 'Danh mục',
          style: const TextStyle(fontSize: 17),
        ),
      ),

      body: Column(
        children: [
          // Sort/filter bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Còn hàng'),
                  selected: _inStockOnly,
                  onSelected: (selected) =>
                      setState(() => _inStockOnly = selected),
                  selectedColor: AppColors.accent.withValues(alpha: .15),
                  checkmarkColor: AppColors.accent,
                ),

                const Spacer(),

                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _sort,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textPrimary,
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'relevant',
                        child: Text('Liên quan'),
                      ),
                      DropdownMenuItem(
                        value: 'best-seller',
                        child: Text('Bán chạy'),
                      ),
                      DropdownMenuItem(
                        value: 'price-asc',
                        child: Text('Giá thấp → cao'),
                      ),
                      DropdownMenuItem(
                        value: 'price-desc',
                        child: Text('Giá cao → thấp'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _sort = value);
                      }
                    },
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: FutureBuilder<List<Product>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const LoadingState();
                }

                if (snapshot.hasError) {
                  return ErrorState(
                    message: 'Không thể tải sản phẩm. ${snapshot.error}',
                    onRetry: _load,
                  );
                }

                _products = snapshot.data ?? [];

                if (_visible.isEmpty) {
                  return const EmptyState(
                    icon: Icons.inventory_2_outlined,
                    message: 'Danh mục chưa có sản phẩm',
                  );
                }

                return GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.72,
                  ),
                  itemCount: _visible.length,
                  itemBuilder: (context, index) {
                    return ProductCard(product: _visible[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
