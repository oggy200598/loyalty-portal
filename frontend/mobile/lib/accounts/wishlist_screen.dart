import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../common/api_client.dart';
import '../common/format.dart';
import 'wishlist_service.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});
  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _busy = false;
  String? _error;
  WishlistService get service => WishlistService(context.read<ApiClient>());
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final rows = await service.fetchItems();
      if (mounted) setState(() => _items = rows);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove(String id) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await service.remove(id);
      if (mounted) await _load();
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Sản phẩm yêu thích'),
      actions: [
        IconButton(
          tooltip: 'Tải lại',
          onPressed: _busy ? null : _load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: () async {
        if (!_busy) await _load();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (_busy) const LinearProgressIndicator(),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          if (!_busy && _items.isEmpty)
            const Text('Chưa có sản phẩm yêu thích.'),
          for (final item in _items)
            ListTile(
              title: Text(
                '${item['products']?['name'] ?? 'Sản phẩm không còn tồn tại'}',
              ),
              subtitle: Text(
                item['products']?['status'] == 'ACTIVE'
                    ? formatCurrency(
                        num.tryParse('${item['products']?['price']}') ?? 0,
                      )
                    : 'Ngừng bán',
              ),
              onTap: _busy || item['products']?['status'] != 'ACTIVE'
                  ? null
                  : () => context.push('/products/${item['product_id']}'),
              trailing: IconButton(
                tooltip: 'Bỏ yêu thích',
                onPressed: _busy
                    ? null
                    : () => _remove('${item['product_id']}'),
                icon: const Icon(Icons.favorite),
              ),
            ),
        ],
      ),
    ),
  );
}
