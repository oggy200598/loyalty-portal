import 'package:flutter/foundation.dart';

import '../core/network/api_client.dart';
import '../core/storage/local_storage.dart';
import '../services/auth_service.dart';

class AppUser {
  final String id;
  final String name;
  final String email;
  final String? role;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id']?.toString() ?? '',
      name: (json['name'] ??
              json['fullName'] ??
              'Người dùng')
          .toString(),
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString(),
    );
  }

  bool get isSeller => role == 'SELLER';
}

class AuthProvider extends ChangeNotifier {
  final AuthService authService;
  final LocalStorage storage;

  AppUser? user;
  bool initialized = false;

  AuthProvider({
    required this.authService,
    required this.storage,
  });

  String? _token;
  String? get token => _token;
  bool get isAuthenticated => _token != null && user != null;

  /// Tạo ApiClient dùng chung, tự clear auth khi 401.
  ApiClient createClient() {
    return ApiClient(
      tokenProvider: () => _token,
      onUnauthorized: () => logout(),
    );
  }

  Future<void> bootstrap() async {
    _token = await storage.getToken();

    if (_token != null) {
      try {
        final me = await authService.me();
        user = me == null ? null : AppUser.fromJson(me);
      } catch (_) {
        await _clear();
      }
    }

    initialized = true;
    notifyListeners();
  }

  Future<bool> login(
    String email,
    String password,
  ) async {
    final response = await authService.login(
      email,
      password,
    );

    _token = response['accessToken']?.toString();
    await storage.setToken(_token);

    final rawUser = response['user'];
    user = rawUser is Map<String, dynamic>
        ? AppUser.fromJson(rawUser)
        : null;

    notifyListeners();
    return true;
  }

  Future<bool> register(
    Map<String, dynamic> payload,
  ) async {
    final response = await authService.register(payload);

    _token = response['accessToken']?.toString();
    await storage.setToken(_token);

    final rawUser = response['user'];
    user = rawUser is Map<String, dynamic>
        ? AppUser.fromJson(rawUser)
        : null;

    notifyListeners();
    return true;
  }

  Future<void> logout() async {
    await _clear();
    notifyListeners();
  }

  Future<void> _clear() async {
    _token = null;
    user = null;
    await storage.setToken(null);
  }
}
