import '../core/network/api_client.dart';

/// Auth service — endpoint /auth/* đã tồn tại trên backend.
class AuthService {
  final ApiClient client;

  AuthService(this.client);

  /// Trả về { accessToken, user }.
  Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final data = await client.post('/auth/login', {
      'email': email,
      'password': password,
    });

    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> register(
    Map<String, dynamic> payload,
  ) async {
    final data = await client.post('/auth/register', payload);
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> forgotPassword(
    String email,
  ) async {
    final data = await client.post('/auth/forgot-password', {
      'email': email,
    });

    return data as Map<String, dynamic>;
  }

  /// GET /auth/me — dùng để bootstrap phiên đăng nhập.
  Future<Map<String, dynamic>?> me() async {
    final data = await client.get('/auth/me');
    return data is Map<String, dynamic> ? data : null;
  }
}
