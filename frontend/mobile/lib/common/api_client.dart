import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

String errorMessage(Object? error) {
  final raw = (error is ApiException ? error.message : '$error')
      .replaceFirst(
        RegExp(r'^(?:ApiException|Exception|FormatException):\s*'),
        '',
      )
      .trim();
  const known = {
    'Invalid credentials': 'Tên tài khoản hoặc mật khẩu không đúng.',
    'Insufficient role': 'Bạn không có quyền thực hiện thao tác này.',
    'Stream unavailable': 'Kết nối thông báo tạm thời gián đoạn.',
  };
  if (known.containsKey(raw)) return known[raw]!;
  if (RegExp(r'[À-ỹĐđ]').hasMatch(raw) &&
      !RegExp(r'<[a-z][^>]*>', caseSensitive: false).hasMatch(raw)) {
    return raw;
  }
  return 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}

/// Exception chuẩn hóa cho lỗi API.
class ApiException implements Exception {
  final int? statusCode;
  final String message;

  const ApiException(this.message, {this.statusCode});

  bool get isUnauthorized => statusCode == 401;
  bool get isNetworkError => statusCode == null;

  @override
  String toString() => errorMessage(this);
}

/// Client HTTP tập trung: base URL, token, timeout, error handling.
class ApiClient {
  String? Function() tokenProvider;
  void Function()? onUnauthorized;

  ApiClient({required this.tokenProvider, this.onUnauthorized});

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};

    final token = tokenProvider();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  Future<dynamic> get(String path) async {
    return _run(
      () =>
          http.get(Uri.parse('${ApiConfig.baseUrl}$path'), headers: _headers()),
    );
  }

  Future<dynamic> post(String path, Map<String, dynamic>? body) async {
    return _run(
      () => http.post(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(),
        body: jsonEncode(body ?? {}),
      ),
      clearSession: path != '/auth/login',
    );
  }

  Future<dynamic> put(String path, Map<String, dynamic>? body) async {
    return _run(
      () => http.put(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(),
        body: jsonEncode(body ?? {}),
      ),
    );
  }

  Future<dynamic> patch(String path, Map<String, dynamic>? body) async {
    return _run(
      () => http.patch(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(),
        body: jsonEncode(body ?? {}),
      ),
    );
  }

  Future<dynamic> delete(String path) async {
    return _run(
      () => http.delete(
        Uri.parse('${ApiConfig.baseUrl}$path'),
        headers: _headers(),
      ),
    );
  }

  Future<dynamic> _run(
    Future<http.Response> Function() request, {
    bool clearSession = true,
  }) async {
    http.Response response;

    try {
      response = await request().timeout(ApiConfig.receiveTimeout);
    } on TimeoutException {
      throw const ApiException('Kết nối quá chậm. Vui lòng thử lại.');
    } catch (_) {
      throw const ApiException(
        'Không có kết nối mạng. Vui lòng kiểm tra internet.',
      );
    }

    if (response.statusCode == 401) {
      if (clearSession) onUnauthorized?.call();
      throw ApiException(
        clearSession
            ? 'Phiên đăng nhập đã hết hạn.'
            : 'Tên tài khoản hoặc mật khẩu không đúng.',
        statusCode: 401,
      );
    }

    if (response.statusCode >= 400) {
      String message = 'Lỗi máy chủ (${response.statusCode})';

      try {
        final body = jsonDecode(response.body);
        if (body is Map && body['message'] != null) {
          message = body['message'] is List
              ? (body['message'] as List).join(' ')
              : body['message'].toString();
        }
      } catch (_) {
        // Giữ thông báo tiếng Việt mặc định khi proxy trả HTML hoặc văn bản kỹ thuật.
      }

      throw ApiException(
        errorMessage(message),
        statusCode: response.statusCode,
      );
    }

    if (response.body.isEmpty) return null;

    try {
      return _resolveImages(jsonDecode(response.body));
    } catch (_) {
      throw const ApiException(
        'Dữ liệu máy chủ trả về không hợp lệ. Vui lòng thử lại.',
      );
    }
  }
}

class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}

dynamic _resolveImages(dynamic value) {
  if (value is List) return value.map(_resolveImages).toList();
  if (value is Map<String, dynamic>) {
    return value.map(
      (key, entry) => MapEntry(
        key,
        key == 'imageUrl' &&
                entry is String &&
                entry.startsWith('/media/products/')
            ? '${ApiConfig.baseUrl.replaceFirst(RegExp(r'/$'), '')}$entry'
            : _resolveImages(entry),
      ),
    );
  }
  return value;
}
