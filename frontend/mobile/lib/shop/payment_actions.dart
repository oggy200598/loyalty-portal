import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../common/api_client.dart';
import 'order.dart';

class MomoPayments {
  final ApiClient client;
  final Future<bool> Function(Uri) openLink;
  MomoPayments(this.client, {Future<bool> Function(Uri)? openLink})
    : openLink =
          openLink ??
          ((uri) => launchUrl(uri, mode: LaunchMode.externalApplication));
  Future<bool> available() async =>
      (await client.get('/payments/momo/availability') as Map)['enabled'] ==
      true;
  Future<Uri> create(String orderId) async {
    final data = await client.post('/payments/momo/orders/$orderId', {});
    final uri = Uri.tryParse('${data['paymentUrl']}');
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host != 'test-payment.momo.vn' ||
        uri.userInfo.isNotEmpty ||
        uri.port != 443 ||
        uri.path != '/v2/gateway/pay') {
      throw const ApiException('Liên kết thanh toán MoMo không hợp lệ.');
    }
    return uri;
  }

  Future<void> open(Uri uri) async {
    if (!await openLink(uri)) {
      throw const ApiException(
        'Chưa mở được MoMo. Bấm mở trang thanh toán để thử lại.',
      );
    }
  }
}

class OrderPaymentPanel extends StatefulWidget {
  final Order order;
  final MomoPayments payments;
  final Future<void> Function() onRefresh;
  const OrderPaymentPanel({
    super.key,
    required this.order,
    required this.payments,
    required this.onRefresh,
  });
  @override
  State<OrderPaymentPanel> createState() => _OrderPaymentPanelState();
}

class _OrderPaymentPanelState extends State<OrderPaymentPanel>
    with WidgetsBindingObserver {
  bool _busy = false, _enabled = false, _checked = false;
  String? _error;
  Uri? _url;
  bool get _canPay =>
      widget.order.paymentMethod == 'MOMO' &&
      widget.order.paymentStatus == 'UNPAID' &&
      [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPING',
        'DELIVERED',
        'COMPLETED',
      ].contains(widget.order.status);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (_canPay) {
      _availability();
    } else {
      _checked = true;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_busy) unawaited(_refresh());
  }

  Future<void> _availability() async {
    try {
      final enabled = await widget.payments.available();
      if (mounted) {
        setState(() {
          _enabled = enabled;
          _checked = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = errorMessage(e);
          _checked = true;
        });
      }
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onRefresh();
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pay() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final uri = await widget.payments.create(widget.order.id);
      if (!mounted) return;
      setState(() => _url = uri);
      await widget.payments.open(uri);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const labels = {
      'UNPAID': 'Chưa thanh toán',
      'PAID': 'Đã thanh toán',
      'REFUNDED': 'Đã hoàn tiền',
      'PARTIALLY_REFUNDED': 'Đã hoàn một phần',
      'FAILED': 'Thanh toán thất bại',
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Thanh toán: ${labels[widget.order.paymentStatus] ?? widget.order.paymentStatus}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        if (_error != null)
          Text(_error!, style: const TextStyle(color: Colors.red)),
        if (_canPay) ...[
          const Text(
            'Trạng thái cập nhật sau khi MoMo xác nhận. Quay lại ứng dụng để kiểm tra kết quả.',
          ),
          if (!_checked) const LinearProgressIndicator(),
          if (_checked && !_enabled)
            const Text('MoMo sandbox chưa được cấu hình.'),
          FilledButton(
            onPressed: _busy || !_enabled ? null : _pay,
            child: const Text('Thanh toán MoMo'),
          ),
          if (_url != null)
            TextButton(
              onPressed: _busy
                  ? null
                  : () async {
                      setState(() {
                        _busy = true;
                        _error = null;
                      });
                      try {
                        await widget.payments.open(_url!);
                      } catch (e) {
                        if (mounted) setState(() => _error = errorMessage(e));
                      } finally {
                        if (mounted) setState(() => _busy = false);
                      }
                    },
              child: const Text('Mở lại trang thanh toán'),
            ),
        ],
        TextButton(
          onPressed: _busy ? null : _refresh,
          child: Text(
            _busy ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán / tải lại đơn',
          ),
        ),
      ],
    );
  }
}
