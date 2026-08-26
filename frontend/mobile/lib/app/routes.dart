import 'package:go_router/go_router.dart';

import '../screens/home/home_screen.dart';
import '../screens/category/category_screen.dart';
import '../screens/category/category_products_screen.dart';
import '../screens/search/search_screen.dart';
import '../screens/product/product_detail_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/checkout/checkout_screen.dart';
import '../screens/order/order_success_screen.dart';
import '../screens/order/orders_screen.dart';
import '../screens/order/order_detail_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/notification/notification_screen.dart';
import '../screens/account/account_screen.dart';
import '../widgets/app_header.dart';

/// Router dùng go_router.
/// Bottom nav là shell chung — các tab render bên trong MainShell.
GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/',
    routes: [
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
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),

          GoRoute(
            path: '/categories',
            builder: (_, __) => const CategoryScreen(),
          ),

          GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),

          GoRoute(
            path: '/notifications',
            builder: (_, __) => const NotificationScreen(),
          ),

          GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
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

      GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),

      GoRoute(
        path: '/order-success/:id',
        builder: (_, state) =>
            OrderSuccessScreen(orderId: state.pathParameters['id']!),
      ),

      GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),

      GoRoute(
        path: '/orders/:id',
        builder: (_, state) =>
            OrderDetailScreen(orderId: state.pathParameters['id']!),
      ),

      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),

      GoRoute(
        path: '/forgot-password',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
    ],
  );
}
