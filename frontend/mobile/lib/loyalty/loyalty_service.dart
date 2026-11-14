import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';
import '../common/api_client.dart';

class LoyaltyService {
  final ApiClient client;
  final String userId;
  LoyaltyService(this.client, this.userId);
  Future<Map<String, dynamic>> summary() async =>
      Map<String, dynamic>.from(await client.get('/loyalty/me'));
  Future<List<Map<String, dynamic>>> rewards() async =>
      (await client.get('/loyalty/rewards') as List)
          .cast<Map<String, dynamic>>();
  Future<Map<String, dynamic>> page(
    String section,
    int page, [
    Map<String, String> filters = const {},
  ]) async => Map<String, dynamic>.from(
    await client.get(
      Uri(
        path: '/loyalty/$section',
        queryParameters: {'page': '$page', 'limit': '20', ...filters},
      ).toString(),
    ),
  );
  Future<void> complain(String type, String message, String orderId) async {
    await client.post('/loyalty/complaints', {
      'type': type,
      'message': message.trim(),
      if (orderId.trim().isNotEmpty) 'orderId': orderId.trim(),
    });
  }

  Future<Map<String, dynamic>> redeem(String rewardId) async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'loyalty:redeem:$userId:$rewardId';
    var requestId = prefs.getString(key);
    if (requestId == null) {
      final random = Random.secure();
      final bytes = List.generate(16, (_) => random.nextInt(256));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
      requestId =
          '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
      if (!await prefs.setString(key, requestId)) {
        throw const ApiException(
          'Không thể lưu yêu cầu đổi thưởng. Hãy thử lại.',
        );
      }
    }
    // Giữ mã khi mất mạng, thử lại sau khi mở app không trừ điểm hai lần.
    final result = Map<String, dynamic>.from(
      await client.post('/loyalty/redemptions', {
        'rewardId': rewardId,
        'idempotencyKey': requestId,
      }),
    );
    await prefs.remove(key);
    return result;
  }
}
