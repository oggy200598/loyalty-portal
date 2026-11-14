import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../common/theme.dart';
import 'cart_item.dart';
import 'cart_provider.dart';
import '../common/format.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final Set<String> _selectedKeys = {};

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final cart = context.read<CartProvider>();
      if (cart.items.isEmpty) {
        cart.load();
      }
    });
  }

  String _keyOf(CartItem item) => '${item.productId}-${item.variantId ?? '-'}';

  bool _isSelected(CartItem item) => _selectedKeys.contains(_keyOf(item));

  List<CartItem> get _selectedItems {
    final cart = context.read<CartProvider>();
    return cart.items.where(_isSelected).toList();
  }

  num get _selectedSubtotal {
    return _selectedItems.fold(0, (sum, item) => sum + item.subtotal);
  }

  void _toggleSelect(CartItem item) {
    setState(() {
      final key = _keyOf(item);
      if (!_selectedKeys.remove(key)) {
        _selectedKeys.add(key);
      }
    });
  }

  void _toggleSelectAll(bool? value) {
    final cart = context.read<CartProvider>();

    setState(() {
      if (value == true) {
        _selectedKeys.addAll(cart.items.map(_keyOf));
      } else {
        _selectedKeys.clear();
      }
    });
  }

  Future<void> _updateQuantity(int index, int quantity) async {
    await context.read<CartProvider>().updateQuantity(index, quantity);
  }

  Future<void> _removeAt(int index) async {
    final item = context.read<CartProvider>().items[index];

    _selectedKeys.remove(_keyOf(item));
    await context.read<CartProvider>().removeAt(index);
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    final allSelected = cart.items.isNotEmpty && cart.items.every(_isSelected);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Giỏ hàng${cart.items.isEmpty ? '' : ' (${cart.items.length})'}',
        ),
      ),

      body: cart.items.isEmpty
          ? EmptyCart(onGoShopping: () => context.go('/'))
          : Column(
              children: [
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    children: [
                      Checkbox(
                        value: allSelected,
                        onChanged: _toggleSelectAll,
                        activeColor: AppColors.accent,
                      ),
                      Text(
                        'Chọn tất cả (${cart.items.length})',
                        style: const TextStyle(fontSize: 13.5),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = cart.items[index];

                      return CartItemTile(
                        item: item,
                        selected: _isSelected(item),
                        onToggle: () => _toggleSelect(item),
                        onQuantityChanged: (qty) => _updateQuantity(index, qty),
                        onRemove: () => _removeAt(index),
                      );
                    },
                  ),
                ),

                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '${_selectedItems.length} sản phẩm',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              Text(
                                formatCurrency(_selectedSubtotal),
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.accent,
                                ),
                              ),
                            ],
                          ),
                        ),

                        ElevatedButton(
                          onPressed: _selectedItems.isEmpty
                              ? null
                              : () {
                                  context.go(
                                    Uri(
                                      path: '/checkout',
                                      queryParameters: {
                                        'items': _selectedKeys.join(','),
                                      },
                                    ).toString(),
                                  );
                                },
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(140, 46),
                          ),
                          child: const Text('Thanh toán'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class CartItemTile extends StatelessWidget {
  final CartItem item;
  final bool selected;
  final VoidCallback onToggle;
  final ValueChanged<int> onQuantityChanged;
  final VoidCallback onRemove;

  const CartItemTile({
    super.key,
    required this.item,
    required this.selected,
    required this.onToggle,
    required this.onQuantityChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Checkbox(
              value: selected,
              onChanged: (_) => onToggle(),
              activeColor: AppColors.accent,
            ),

            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: item.imageUrl != null
                  ? Image.network(
                      item.imageUrl!,
                      width: 72,
                      height: 72,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const _ImagePlaceholder(),
                    )
                  : const _ImagePlaceholder(),
            ),

            const SizedBox(width: 10),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.productName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13.5, height: 1.35),
                  ),

                  if (item.variantName != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        'Phân loại: ${item.variantName}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),

                  const SizedBox(height: 6),

                  Row(
                    children: [
                      Text(
                        formatCurrency(item.unitPrice),
                        style: const TextStyle(
                          color: AppColors.accent,
                          fontWeight: FontWeight.w700,
                          fontSize: 14.5,
                        ),
                      ),

                      const Spacer(),

                      Row(
                        children: [
                          _QtyButton(
                            icon: Icons.remove,
                            onTap: item.quantity > 1
                                ? () => onQuantityChanged(item.quantity - 1)
                                : null,
                          ),

                          Container(
                            constraints: const BoxConstraints(minWidth: 32),
                            alignment: Alignment.center,
                            child: Text(
                              '${item.quantity}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),

                          _QtyButton(
                            icon: Icons.add,
                            onTap: item.quantity < item.stockQuantity
                                ? () => onQuantityChanged(item.quantity + 1)
                                : null,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            IconButton(
              onPressed: onRemove,
              icon: const Icon(
                Icons.delete_outline,
                color: AppColors.textSecondary,
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _QtyButton({required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          size: 16,
          color: onTap == null ? Colors.grey : AppColors.textPrimary,
        ),
      ),
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      height: 72,
      color: const Color(0xFFFAFAFA),
      child: const Icon(Icons.image_outlined, color: Colors.grey),
    );
  }
}

class EmptyCart extends StatelessWidget {
  final VoidCallback onGoShopping;

  const EmptyCart({super.key, required this.onGoShopping});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 64,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 12),
          const Text(
            'Giỏ hàng trống',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          const Text(
            'Hãy thêm sản phẩm vào giỏ nhé!',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: onGoShopping,
            child: const Text('Mua sắm ngay'),
          ),
        ],
      ),
    );
  }
}
