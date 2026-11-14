import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_client.dart';

class NotificationFeed extends ChangeNotifier {
  final Stream<Map<String, dynamic>> Function(String)? source;
  final ApiClient api;
  StreamSubscription<Map<String, dynamic>>? _subscription;
  String? _session;
  String _fingerprint = '';
  int unreadCount = 0;
  NotificationFeed(this.api, {this.source});
  void bind(String? token) {
    if (token == _session) return;
    _session = token;
    _subscription?.cancel();
    _fingerprint = '';
    unreadCount = 0;
    notifyListeners();
    if (token == null) return;
    _subscription = (source?.call(token) ?? _events(token)).listen((snapshot) {
      if (_session != token) return;
      final fingerprint = jsonEncode(snapshot);
      if (fingerprint == _fingerprint) return;
      _fingerprint = fingerprint;
      unreadCount = (snapshot['unreadCount'] as num).toInt();
      notifyListeners();
    });
  }

  Stream<Map<String, dynamic>> _events(String token) async* {
    while (_session == token) {
      final client = http.Client();
      try {
        final request = http.Request(
          'GET',
          Uri.parse('${ApiConfig.baseUrl}/notifications/stream'),
        )..headers['Authorization'] = 'Bearer $token';
        final response = await client
            .send(request)
            .timeout(ApiConfig.receiveTimeout);
        if (response.statusCode == 401) {
          if (_session == token) api.onUnauthorized?.call();
          return;
        }
        if (response.statusCode != 200) {
          throw const ApiException('Stream unavailable');
        }
        await for (final line
            in response.stream
                .timeout(const Duration(seconds: 15))
                .transform(utf8.decoder)
                .transform(const LineSplitter())) {
          if (_session != token) return;
          if (line.startsWith('data:')) {
            final data = jsonDecode(line.substring(5).trim());
            if (data is Map<String, dynamic> && data['unreadCount'] is num) {
              yield data;
            }
          }
        }
      } catch (_) {
        /* Nối lại khi mạng phục hồi. */
      } finally {
        client.close();
      }
      if (_session == token) {
        await Future<void>.delayed(const Duration(seconds: 2));
      }
    }
  }

  @override
  void dispose() {
    _session = null;
    _subscription?.cancel();
    super.dispose();
  }
}
