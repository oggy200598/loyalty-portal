import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Lưu trữ token + cart/orders cục bộ bằng SharedPreferences.
class LocalStorage {
  String? userId;

  Future<void> clearLegacyPrivateData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('orders');
    await prefs.remove('cart');
  }

  String _scoped(String key) => '$key:${userId ?? 'guest'}';

  static const _tokenKey = 'accessToken';
  static const _cartKey = 'cart';
  static const _ordersKey = 'orders';

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> setToken(String? token) async {
    final prefs = await SharedPreferences.getInstance();
    if (token == null || token.isEmpty) {
      await prefs.remove(_tokenKey);
    } else {
      await prefs.setString(_tokenKey, token);
    }
  }

  Future<List<Map<String, dynamic>>> getJsonList(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);

    if (raw == null) return [];

    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.whereType<Map<String, dynamic>>().toList();
      }
    } catch (_) {}

    return [];
  }

  Future<void> setJsonList(String key, List<Map<String, dynamic>> value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(value));
  }

  Future<List<Map<String, dynamic>>> getCart() =>
      getJsonList(_scoped(_cartKey));

  Future<void> setCart(List<Map<String, dynamic>> value) =>
      setJsonList(_scoped(_cartKey), value);

  Future<List<Map<String, dynamic>>> getOrders() =>
      getJsonList(_scoped(_ordersKey));

  Future<void> setOrders(List<Map<String, dynamic>> value) =>
      setJsonList(_scoped(_ordersKey), value);
}
