import 'package:go_router/go_router.dart';
import 'accounts/auth_provider.dart';
import 'accounts/address_book.dart';
import 'loyalty/loyalty_screen.dart';
import 'accounts/wishlist_screen.dart';

import 'shop/home_screen.dart';
import 'shop/category_screen.dart';
import 'shop/category_products_screen.dart';
import 'shop/search_screen.dart';
import 'shop/product_detail_screen.dart';
import 'shop/cart_screen.dart';
import 'shop/checkout_screen.dart';
import 'shop/order_success_screen.dart';
import 'shop/orders_screen.dart';
import 'shop/order_detail_screen.dart';
import 'accounts/login_screen.dart';
import 'accounts/register_screen.dart';
import 'accounts/forgot_password_screen.dart';
import 'accounts/notification_screen.dart';
import 'accounts/account_screen.dart';
import 'common/app_header.dart';

/// Router dùng go_router.
/// Bottom nav là shell chung — các tab render bên trong MainShell.
GoRouter buildRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (_, state) {
      final path = state.uri.path;
      if (!auth.isAuthenticated &&
          (path == '/checkout' ||
              path.startsWith('/orders') ||
              path.startsWith('/order-success') ||
              path == '/notifications' ||
              path == '/loyalty' ||
              path == '/wishlist' ||
              path == '/account/profile' ||
              path == '/account/password' ||
              path == '/account/addresses')) {
        return '/login';
      }
      if (auth.isAuthenticated &&
          (path == '/loyalty' || path == '/wishlist') &&
          auth.user?.role != 'BUYER') {
        return '/account';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/account/password',
        builder: (_, _) => const PasswordScreen(change: true),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (_, _) => const PasswordScreen(),
      ),
      GoRoute(path: '/store-info', builder: (_, _) => const StoreInfoScreen()),
      GoRoute(
        path: '/account/addresses',
        builder: (_, _) => const AddressBookScreen(),
      ),
      GoRoute(
        path: '/account/profile',
        builder: (_, _) => const ProfileScreen(),
      ),
      GoRoute(path: '/wishlist', builder: (_, _) => const WishlistScreen()),
      GoRoute(
        path: '/loyalty',
        builder: (_, state) => LoyaltyScreen(
          initialTab: state.uri.queryParameters['tab'] ?? 'overview',
        ),
      ),
      ShellRoute(
        builder: (context, state, child) {
          final location = state.uri.path;

          int index = 0;
          if (location.startsWith('/categories')) {
            index = 1;
          } else if (location.startsWith('/cart')) {
            index = 2;
          } else if (location.startsWith('/notifications')) {
            index = 3;
          } else if (location.startsWith('/account')) {
            index = 4;
          }

          return MainShell(currentIndex: index, child: child);
        },
        routes: [
          GoRoute(path: '/', builder: (_, _) => const HomeScreen()),

          GoRoute(
            path: '/categories',
            builder: (_, _) => const CategoryScreen(),
          ),

          GoRoute(path: '/cart', builder: (_, _) => const CartScreen()),

          GoRoute(
            path: '/notifications',
            builder: (_, _) => const NotificationScreen(),
          ),

          GoRoute(path: '/account', builder: (_, _) => const AccountScreen()),
        ],
      ),

      // Các route ngoài bottom nav
      GoRoute(
        path: '/products/:id',
        builder: (_, state) =>
            ProductDetailScreen(productId: state.pathParameters['id']!),
      ),

      GoRoute(
        path: '/categories/:id',
        builder: (_, state) => CategoryProductsScreen(
          categoryId: state.pathParameters['id']!,
          categoryName: state.uri.queryParameters['name'],
        ),
      ),

      GoRoute(
        path: '/search',
        builder: (_, state) =>
            SearchScreen(query: state.uri.queryParameters['q'] ?? ''),
      ),

      GoRoute(
        path: '/checkout',
        builder: (_, state) => CheckoutScreen(
          couponCode: state.uri.queryParameters['coupon'],
          selectedKeys: state.uri.queryParameters['items']?.split(',').toSet(),
        ),
      ),

      GoRoute(
        path: '/order-success/:id',
        builder: (_, state) => OrderSuccessScreen(
          orderId: state.pathParameters['id']!,
          relatedIds: state.uri.queryParameters['ids']?.split(',') ?? const [],
        ),
      ),

      GoRoute(path: '/orders', builder: (_, _) => const OrdersScreen()),

      GoRoute(
        path: '/orders/:id',
        builder: (_, state) =>
            OrderDetailScreen(orderId: state.pathParameters['id']!),
      ),

      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),

      GoRoute(path: '/register', builder: (_, _) => const RegisterScreen()),

      GoRoute(
        path: '/forgot-password',
        builder: (_, _) => const ForgotPasswordScreen(),
      ),
    ],
  );
}
