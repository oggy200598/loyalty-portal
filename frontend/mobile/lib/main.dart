import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app/app.dart';
import 'app/routes.dart';
import 'core/network/api_client.dart';
import 'core/storage/local_storage.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/order_provider.dart';
import 'providers/product_provider.dart';
import 'services/auth_service.dart';
import 'services/cart_service.dart';
import 'services/order_service.dart';
import 'services/product_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final storage = LocalStorage();

  // Token đọc từ storage để bootstrap phiên đăng nhập.
  final bootstrapToken = await storage.getToken();

  final authProvider = AuthProvider(
    authService: AuthService(ApiClient(tokenProvider: () => bootstrapToken)),
    storage: storage,
  );

  await authProvider.bootstrap();

  // Client chính: token luôn lấy từ provider (tự cập nhật sau login/logout).
  final client = authProvider.createClient();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),

        Provider<ApiClient>.value(value: client),

        Provider<ProductService>(create: (_) => ProductService(client)),

        Provider<OrderService>(create: (_) => OrderService(client, storage)),

        ChangeNotifierProvider(
          create: (context) =>
              ProductProvider(productService: context.read<ProductService>()),
        ),

        ChangeNotifierProvider(
          create: (_) => CartProvider(
            storage: storage,
            // Sync backend khi đã đăng nhập (null client token → API lỗi → fallback local)
            cartService: CartService(client),
          ),
        ),

        ChangeNotifierProvider(
          create: (context) =>
              OrderProvider(orderService: context.read<OrderService>()),
        ),
      ],
      child: Builder(
        builder: (context) {
          // Load giỏ hàng cục bộ khi mở app.
          context.read<CartProvider>().load();

          return RiskMindApp(router: buildRouter());
        },
      ),
    ),
  );
}
