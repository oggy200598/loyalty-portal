import 'package:go_router/go_router.dart';
import 'common/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'routes.dart';
import 'common/api_client.dart';
import 'common/local_storage.dart';
import 'common/notification_feed.dart';
import 'accounts/auth_provider.dart';
import 'shop/cart_provider.dart';
import 'shop/order_provider.dart';
import 'shop/product_provider.dart';
import 'shop/cart_service.dart';
import 'shop/order_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final storage = LocalStorage();
  await storage.clearLegacyPrivateData();

  // Một client dùng token hiện tại cho bootstrap, đăng nhập và các API sau đó.
  late AuthProvider authProvider;
  final client = ApiClient(
    tokenProvider: () => authProvider.token,
    onUnauthorized: () => authProvider.logout(),
  );
  authProvider = AuthProvider(
    authService: AuthService(client),
    storage: storage,
  );

  await authProvider.bootstrap();

  final cart = CartProvider(storage: storage, cartService: CartService(client));
  final orders = OrderProvider(orderService: OrderService(client));
  final feed = NotificationFeed(client)..bind(authProvider.token);
  String? previousUser = authProvider.user?.id;
  authProvider.addListener(() {
    feed.bind(authProvider.token);
    if (previousUser == authProvider.user?.id) return;
    previousUser = authProvider.user?.id;
    cart.clearMemory();
    orders.clearMemory();
    cart.load().catchError((Object _) {});
  });
  await cart.load().catchError((Object _) {});
  final router = buildRouter(authProvider);
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
        Provider<ApiClient>.value(value: client),
        ChangeNotifierProvider.value(value: feed),
        Provider<ProductService>(create: (_) => ProductService(client)),
        Provider<OrderService>.value(value: orders.orderService),
        ChangeNotifierProvider(
          create: (context) =>
              ProductProvider(productService: context.read<ProductService>()),
        ),
        ChangeNotifierProvider.value(value: cart),
        ChangeNotifierProvider.value(value: orders),
      ],
      child: RiskMindApp(router: router),
    ),
  );
}

class RiskMindApp extends StatelessWidget {
  final GoRouter router;

  const RiskMindApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      locale: const Locale('vi', 'VN'),
      supportedLocales: const [Locale('vi', 'VN')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      title: 'RiskMind',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
