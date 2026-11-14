import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../common/api_client.dart';
import 'auth_provider.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    Widget link(IconData icon, String title, String route) => ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => context.push(route),
    );
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tài khoản'),
        actions: [
          if (auth.isAuthenticated)
            IconButton(
              tooltip: 'Đồng bộ tài khoản',
              icon: const Icon(Icons.refresh),
              onPressed: () async {
                try {
                  await auth.refreshUser();
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text(errorMessage(e))));
                  }
                }
              },
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            auth.user?.name ?? 'Chưa đăng nhập',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(auth.user?.email ?? ''),
          link(Icons.storefront_outlined, 'Thông tin cửa hàng', '/store-info'),
          const SizedBox(height: 16),
          if (auth.isAuthenticated) ...[
            link(Icons.person_outline, 'Hồ sơ cá nhân', '/account/profile'),
            link(Icons.lock_outline, 'Đổi mật khẩu', '/account/password'),
            link(
              Icons.location_on_outlined,
              'Sổ địa chỉ',
              '/account/addresses',
            ),
            if (auth.user?.role == 'BUYER') ...[
              link(Icons.diamond_outlined, 'Khách hàng thân thiết', '/loyalty'),
              link(
                Icons.local_offer_outlined,
                'Voucher đã đổi',
                '/loyalty?tab=redemptions',
              ),
              link(Icons.receipt_long_outlined, 'Đơn hàng', '/orders'),
              link(Icons.favorite_outline, 'Sản phẩm yêu thích', '/wishlist'),
            ],
            link(Icons.notifications_outlined, 'Thông báo', '/notifications'),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Đăng xuất'),
              onTap: () async {
                await auth.logout();
                if (context.mounted) context.go('/');
              },
            ),
          ] else
            link(Icons.login, 'Đăng nhập', '/login'),
        ],
      ),
    );
  }
}

class StoreInfoScreen extends StatefulWidget {
  const StoreInfoScreen({super.key});
  @override
  State<StoreInfoScreen> createState() => _StoreInfoScreenState();
}

class _StoreInfoScreenState extends State<StoreInfoScreen> {
  Map<String, dynamic>? _info;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data =
          await context.read<ApiClient>().get('/settings')
              as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _info = data;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Thông tin cửa hàng'),
      actions: [
        IconButton(
          tooltip: 'Tải lại',
          onPressed: _load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (_error != null)
          Text(_error!, style: const TextStyle(color: Colors.red)),
        if (_info != null) ...[
          Text(
            '${_info!['storeName']}',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          for (final field in ['supportEmail', 'supportPhone', 'storeAddress'])
            if ('${_info![field]}'.isNotEmpty)
              SelectableText('${_info![field]}'),
          Text('Phí giao hàng mỗi shop: ${_info!['shippingFee']} đ'),
          Text(
            'Miễn phí giao hàng từ ${_info!['freeShippingThreshold']} đ / shop',
          ),
        ] else if (_error == null)
          const LinearProgressIndicator(),
      ],
    ),
  );
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  Map<String, dynamic>? _profile;
  bool _busy = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data =
          await context.read<ApiClient>().get('/users/me')
              as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _profile = data;
        _name.text = data['name'] ?? '';
        _phone.text = data['phone'] ?? '';
      });
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data =
          await context.read<ApiClient>().patch('/users/me', {
                'fullName': _name.text.trim(),
                'phone': _phone.text.trim(),
                'expectedUpdatedAt': _profile!['updatedAt'],
              })
              as Map<String, dynamic>;
      if (!mounted) return;
      setState(() => _profile = data);
      await auth.refreshUser();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Đã lưu thông tin.')));
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Hồ sơ cá nhân'),
      actions: [
        IconButton(
          onPressed: _busy ? null : _load,
          tooltip: 'Tải lại từ máy chủ',
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Thông tin dùng chung trên web và ứng dụng.'),
            if (_busy) const LinearProgressIndicator(),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_profile != null) ...[
              const SizedBox(height: 16),
              Text(_profile!['email'].toString()),
              TextFormField(
                controller: _name,
                enabled: !_busy,
                maxLength: 255,
                decoration: const InputDecoration(labelText: 'Họ tên'),
                validator: (v) =>
                    (v ?? '').trim().isEmpty ? 'Nhập họ tên' : null,
              ),
              TextFormField(
                controller: _phone,
                enabled: !_busy,
                keyboardType: TextInputType.phone,
                maxLength: 20,
                decoration: const InputDecoration(labelText: 'Số điện thoại'),
                validator: (v) => RegExp(r'^[+0-9 ()-]*$').hasMatch(v ?? '')
                    ? null
                    : 'Số điện thoại không hợp lệ',
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: const Text('Lưu thay đổi'),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}
