import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/theme.dart';
import '../../providers/auth_provider.dart';

/// Phase 1: khung tài khoản — đầy đủ ở Phase 6 (profile, address...).
class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Tôi')),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          // Profile card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: AppColors.accent,
                    child: Text(
                      auth.user?.name.isNotEmpty == true
                          ? auth.user!.name[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          auth.user?.name ?? 'Chưa đăng nhập',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        if (auth.user?.email != null)
                          Text(
                            auth.user!.email,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Menu chính
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(
                    Icons.receipt_long_outlined,
                    color: AppColors.accent,
                  ),
                  title: const Text(
                    'Đơn hàng của tôi',
                    style: TextStyle(fontSize: 14),
                  ),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: () => context.push('/orders'),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(
                    Icons.favorite_outline,
                    color: AppColors.accent,
                  ),
                  title: const Text(
                    'Sản phẩm yêu thích',
                    style: TextStyle(fontSize: 14),
                  ),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(
                    Icons.local_offer_outlined,
                    color: AppColors.accent,
                  ),
                  title: const Text('Voucher', style: TextStyle(fontSize: 14)),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: () {},
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          if (auth.isAuthenticated)
            Card(
              child: ListTile(
                leading: const Icon(Icons.logout, color: AppColors.danger),
                title: const Text('Đăng xuất'),
                onTap: () async {
                  await auth.logout();
                  if (context.mounted) {
                    context.go('/');
                  }
                },
              ),
            )
          else
            Card(
              child: ListTile(
                leading: const Icon(Icons.login, color: AppColors.accent),
                title: const Text('Đăng nhập'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/login'),
              ),
            ),
        ],
      ),
    );
  }
}
