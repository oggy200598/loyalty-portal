import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_config.dart';

/// Exception chuẩn hóa cho lỗi API.
class ApiException implements Exception {
  final int? statusCode;
  final String message;

  const ApiException(this.message, {this.statusCode});

  bool get isUnauthorized => statusCode == 401;
  bool get isNetworkError => statusCode == null;

  @override
  String toString() => message;
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

  Future<dynamic> _run(Future<http.Response> Function() request) async {
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
      onUnauthorized?.call();
      throw ApiException('Phiên đăng nhập đã hết hạn.', statusCode: 401);
    }

    if (response.statusCode >= 400) {
      String message = 'Lỗi máy chủ (${response.statusCode})';

      try {
        final body = jsonDecode(response.body);
        if (body is Map && body['message'] != null) {
          message = body['message'].toString();
        }
      } catch (_) {
        if (response.body.isNotEmpty && response.body.length < 200) {
          message = response.body;
        }
      }

      throw ApiException(message, statusCode: response.statusCode);
    }

    if (response.body.isEmpty) return null;

    return jsonDecode(response.body);
  }
}
