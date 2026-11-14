import 'package:flutter/foundation.dart';

import '../common/api_client.dart';
import '../common/local_storage.dart';

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
      name: (json['name'] ?? json['fullName'] ?? 'Người dùng').toString(),
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

  AuthProvider({required this.authService, required this.storage});

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

    storage.userId = user?.id;
    initialized = true;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    return _acceptSession(await authService.login(email, password));
  }

  Future<bool> register(Map<String, dynamic> payload) async {
    return _acceptSession(await authService.register(payload));
  }

  Future<void> refreshUser() async {
    final session = _token;
    final current = await authService.me();
    if (_token != session) return;
    user = current == null ? null : AppUser.fromJson(current);
    notifyListeners();
  }

  Future<bool> _acceptSession(Map<String, dynamic> response) async {
    _token = response['accessToken']?.toString();
    await storage.setToken(_token);

    final rawUser = response['user'];
    user = rawUser is Map<String, dynamic> ? AppUser.fromJson(rawUser) : null;

    storage.userId = user?.id;
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
    storage.userId = null;
    await storage.clearLegacyPrivateData();
    await storage.setToken(null);
  }
}

class AuthService {
  final ApiClient client;

  AuthService(this.client);

  /// Trả về { accessToken, user }.
  Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await client.post('/auth/login', {
      'email': email,
      'password': password,
    });

    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> payload) async {
    final data = await client.post('/auth/register', payload);
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final data = await client.post('/auth/forgot-password', {'email': email});

    return data as Map<String, dynamic>;
  }

  /// GET /auth/me — dùng để bootstrap phiên đăng nhập.
  Future<Map<String, dynamic>?> me() async {
    final data = await client.get('/auth/me');
    return data is Map<String, dynamic> ? data : null;
  }
}
