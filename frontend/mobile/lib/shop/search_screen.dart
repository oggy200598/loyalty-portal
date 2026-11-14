import '../common/api_client.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../common/theme.dart';
import '../common/loading_state.dart';
import 'product.dart';
import 'product_provider.dart';
import '../common/app_header.dart';
import 'product_card.dart';

class SearchScreen extends StatefulWidget {
  final String query;

  const SearchScreen({super.key, required this.query});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  List<Product> _all = [];
  bool _loading = true;
  String? _error;

  String _sort = 'relevant';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final provider = context.read<ProductProvider>();
      _all = await provider.productService.getProducts(limit: 100);

      // Backend chưa có /products?search= nên tải danh sách
      // rồi lọc client-side theo từ khóa (không dấu).
      // TODO(backend): thêm query param search khi API sẵn sàng.
      final normalized = _normalize(widget.query);
      _all = _all
          .where((product) => _normalize(product.name).contains(normalized))
          .toList();

      if (mounted) setState(() => _loading = false);
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = errorMessage(error);
        });
      }
    }
  }

  static String _normalize(String value) {
    return value.toLowerCase().trim().replaceAll(RegExp(r'đ'), 'd');
  }

  List<Product> get _visible {
    var list = _all;

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
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: SearchHeader(
          initialQuery: widget.query,
          onSubmitted: (query) {
            if (query.trim().isNotEmpty && query.trim() != widget.query) {
              Navigator.of(context).pushReplacementNamed('/');
            }
          },
        ),
      ),

      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: [
                Text(
                  '${_visible.length} kết quả cho "${widget.query}"',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
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

          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingState(message: 'Đang tìm kiếm...');
    }

    if (_error != null) {
      return ErrorState(message: _error!, onRetry: _load);
    }

    if (_visible.isEmpty) {
      return EmptyState(
        icon: Icons.search_off,
        message: 'Không tìm thấy sản phẩm nào khớp với "${widget.query}"',
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
  }
}
