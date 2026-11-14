import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../accounts/auth_provider.dart';
import '../common/api_client.dart';
import '../common/format.dart';
import 'loyalty_service.dart';

class LoyaltyScreen extends StatefulWidget {
  final String initialTab;
  const LoyaltyScreen({super.key, this.initialTab = 'rewards'});
  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  static const sections = {
    'rewards': 'Đổi thưởng',
    'redemptions': 'Phiếu ưu đãi',
    'transactions': 'Lịch sử điểm',
    'complaints': 'Hỗ trợ',
  };
  late final LoyaltyService _service;
  late String _tab;
  Map<String, dynamic>? _summary;
  List<Map<String, dynamic>> _rows = [];
  int _page = 1, _totalPages = 1;
  bool _loading = false, _acting = false;
  String? _error;
  final _form = GlobalKey<FormState>();
  final _message = TextEditingController(), _order = TextEditingController();
  String _type = 'MISSING_POINTS';
  Map<String, String> _filters = {};
  num number(dynamic value) => num.tryParse('$value') ?? 0;
  String date(dynamic value) {
    final parsed = DateTime.tryParse('$value')?.toLocal();
    return parsed == null ? '' : '${parsed.day}/${parsed.month}/${parsed.year}';
  }

  @override
  void initState() {
    super.initState();
    _tab = sections.containsKey(widget.initialTab)
        ? widget.initialTab
        : 'rewards';
    _service = LoyaltyService(
      context.read<ApiClient>(),
      context.read<AuthProvider>().user!.id,
    );
    _load();
  }

  @override
  void dispose() {
    _message.dispose();
    _order.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final summary = await _service.summary();
      final data = _tab == 'rewards'
          ? {'data': await _service.rewards()}
          : await _service.page(_tab, _page, _filters);
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _rows = (data['data'] as List).cast<Map<String, dynamic>>();
        _totalPages = number(
          (data['pagination'] as Map?)?['totalPages'] ?? 1,
        ).toInt();
      });
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showFilters() async {
    final search = TextEditingController(text: _filters['q'] ?? '');
    var selected = _filters[_tab == 'transactions' ? 'kind' : 'status'] ?? '';
    DateTimeRange? range;
    if (_filters['from'] != null && _filters['to'] != null) {
      range = DateTimeRange(
        start: DateTime.parse(_filters['from']!).toLocal(),
        end: DateTime.parse(_filters['to']!).toLocal(),
      );
    }
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, change) {
          final choices = _tab == 'transactions'
              ? {
                  'EARN': 'Tích điểm',
                  'REDEEM': 'Đổi thưởng',
                  'ADJUSTMENT': 'Điều chỉnh',
                  'EXPIRE': 'Hết hạn',
                  'REVERSAL': 'Thu hồi',
                }
              : {
                  'OPEN': 'Mới tiếp nhận',
                  'IN_REVIEW': 'Đang xử lý',
                  'RESOLVED': 'Đã giải quyết',
                  'REJECTED': 'Từ chối',
                };
          return AlertDialog(
            title: const Text('Lọc dữ liệu'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: search,
                    maxLength: 150,
                    decoration: const InputDecoration(
                      labelText: 'Nội dung cần tìm',
                    ),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: selected,
                    items: [
                      const DropdownMenuItem(value: '', child: Text('Tất cả')),
                      ...choices.entries.map(
                        (entry) => DropdownMenuItem(
                          value: entry.key,
                          child: Text(entry.value),
                        ),
                      ),
                    ],
                    onChanged: (value) => change(() => selected = value ?? ''),
                  ),
                  TextButton(
                    onPressed: () async {
                      final picked = await showDateRangePicker(
                        context: ctx,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2100),
                        initialDateRange: range,
                      );
                      if (ctx.mounted && picked != null) {
                        change(() => range = picked);
                      }
                    },
                    child: Text(
                      range == null
                          ? 'Chọn khoảng ngày'
                          : '${date(range!.start.toIso8601String())} – ${date(range!.end.toIso8601String())}',
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, <String, String>{}),
                child: const Text('Xóa lọc'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Hủy'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, <String, String>{
                  if (search.text.trim().isNotEmpty) 'q': search.text.trim(),
                  if (selected.isNotEmpty)
                    (_tab == 'transactions' ? 'kind' : 'status'): selected,
                  if (range != null)
                    'from': DateTime(
                      range!.start.year,
                      range!.start.month,
                      range!.start.day,
                    ).toUtc().toIso8601String(),
                  if (range != null)
                    'to': DateTime(
                      range!.end.year,
                      range!.end.month,
                      range!.end.day,
                      23,
                      59,
                      59,
                      999,
                    ).toUtc().toIso8601String(),
                }),
                child: const Text('Áp dụng'),
              ),
            ],
          );
        },
      ),
    );
    // Dialog transitions can still render its TextField after pop.
    WidgetsBinding.instance.addPostFrameCallback((_) => search.dispose());
    if (!mounted || result == null) return;
    setState(() {
      _filters = result;
      _page = 1;
    });
    await _load();
  }

  Future<void> _redeem(Map<String, dynamic> reward) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận đổi thưởng'),
        content: Text(
          'Đổi ${reward['name']} với ${reward['points_cost']} điểm?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đổi thưởng'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _acting = true;
      _error = null;
    });
    try {
      await _service.redeem('${reward['id']}');
      if (!mounted) return;
      setState(() {
        _tab = 'redemptions';
        _page = 1;
        _rows = [];
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Đã đổi thưởng. Voucher dùng được trên cả web và mobile.',
          ),
        ),
      );
      await _load();
    } catch (e) {
      if (mounted) {
        setState(
          () => _error =
              '${errorMessage(e)} Thử lại cùng phần thưởng để tiếp tục yêu cầu cũ.',
        );
      }
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _complain() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _acting = true;
      _error = null;
    });
    try {
      await _service.complain(_type, _message.text, _order.text);
      if (!mounted) return;
      _message.clear();
      _order.clear();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đã gửi yêu cầu hỗ trợ.')));
      _page = 1;
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final member = _summary?['member'] as Map?;
    final busy = _loading || _acting;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Khách hàng thân thiết'),
        actions: [
          IconButton(
            tooltip: 'Tải lại',
            onPressed: busy ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          if (!busy) await _load();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            if (member != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${member['availablePoints']} điểm',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      Text(
                        'Hạng: ${(member['tier'] as Map?)?['name'] ?? ''} · Chi tiêu: ${formatCurrency(number(member['qualifying_spend']))}',
                      ),
                      Text(
                        'Chu kỳ hạng kết thúc: ${date(member['cycleEndsAt'])}',
                      ),
                      if (number(member['pointsDebt']) > 0)
                        Text(
                          'Điểm cần bù sau hoàn đơn: ${member['pointsDebt']}',
                        ),
                      if (member['nextTier'] is Map)
                        Text(
                          'Hạng tiếp theo: ${member['nextTier']['name']} từ ${formatCurrency(number(member['nextTier']['minimumSpend']))}',
                        ),
                      for (final lot
                          in (member['expiringLots'] as List? ?? []).take(3))
                        Text(
                          '${lot['remaining']} điểm hết hạn ${date(lot['expires_at'])}',
                        ),
                    ],
                  ),
                ),
              ),
            if (_summary != null && member == null)
              const Text(
                'Tài khoản chưa có hồ sơ thành viên. Liên hệ quản trị viên để kiểm tra đồng bộ.',
              ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _tab,
              key: ValueKey(_tab),
              decoration: const InputDecoration(labelText: 'Chức năng'),
              items: sections.entries
                  .map(
                    (s) => DropdownMenuItem(value: s.key, child: Text(s.value)),
                  )
                  .toList(),
              onChanged: busy
                  ? null
                  : (value) {
                      setState(() {
                        _tab = value!;
                        _filters = {};
                        _page = 1;
                        _rows = [];
                      });
                      _load();
                    },
            ),
            if (_summary?['rule']?['config']?['tiers'] is List)
              Card(
                child: ExpansionTile(
                  title: const Text('Quyền lợi theo hạng'),
                  children: [
                    for (final tier
                        in _summary!['rule']['config']['tiers'] as List)
                      ListTile(
                        title: Text(
                          '${tier['name']} · ×${number(tier['multiplierBps']) / 10000}',
                        ),
                        subtitle: Text(
                          'Từ ${formatCurrency(number(tier['minimumSpend']))}\n${tier['benefits'] ?? 'Tích điểm theo hệ số hạng'}',
                        ),
                      ),
                  ],
                ),
              ),
            if (['transactions', 'complaints'].contains(_tab))
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: busy ? null : _showFilters,
                  icon: const Icon(Icons.filter_list),
                  label: Text(
                    _filters.isEmpty
                        ? 'Tìm kiếm / lọc'
                        : 'Đang lọc (${_filters.length})',
                  ),
                ),
              ),
            if (busy) const LinearProgressIndicator(),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            if (_tab == 'complaints') _complaintForm(busy),
            if (!_loading && _rows.isEmpty && _error == null)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('Chưa có dữ liệu.'),
              ),
            for (final row in _rows) _row(row, member, busy),
            if (_tab != 'rewards')
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    tooltip: 'Trang trước',
                    onPressed: busy || _page <= 1
                        ? null
                        : () {
                            _page--;
                            _load();
                          },
                    icon: const Icon(Icons.chevron_left),
                  ),
                  Text('Trang $_page / ${_totalPages < 1 ? 1 : _totalPages}'),
                  IconButton(
                    tooltip: 'Trang sau',
                    onPressed: busy || _page >= _totalPages
                        ? null
                        : () {
                            _page++;
                            _load();
                          },
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _row(Map<String, dynamic> row, Map? member, bool busy) {
    if (_tab == 'rewards') {
      final eligible =
          member != null &&
          number(member['availablePoints']) >= number(row['points_cost']) &&
          number(member['qualifying_spend']) >=
              number(row['minimum_tier_spend']) &&
          number(row['stock']) > 0;
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${row['name']}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text('${row['points_cost']} điểm · Còn ${row['stock']}'),
              Text(
                'Giảm ${formatCurrency(number(row['discount_value']))} · Đơn từ ${formatCurrency(number(row['min_order_value']))}',
              ),
              Text(
                'Chi tiêu tối thiểu: ${formatCurrency(number(row['minimum_tier_spend']))} · Voucher có hạn ${row['voucher_days']} ngày',
              ),
              if (row['description'] != null) Text('${row['description']}'),
              FilledButton(
                onPressed: busy || !eligible ? null : () => _redeem(row),
                child: Text(eligible ? 'Đổi thưởng' : 'Chưa đủ điều kiện'),
              ),
            ],
          ),
        ),
      );
    }
    if (_tab == 'redemptions') {
      final coupon = row['coupon'] as Map?;
      final valid =
          coupon?['status'] == 'ACTIVE' &&
          number(coupon?['used_count']) == 0 &&
          (DateTime.tryParse('${row['expires_at']}')?.isAfter(DateTime.now()) ??
              false);
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${(row['reward'] as Map?)?['name'] ?? 'Voucher'}'),
              SelectableText('${row['coupon_code']}'),
              Text(
                'Hết hạn ${date(row['expires_at'])} · ${valid ? 'Có thể sử dụng' : 'Đã dùng hoặc hết hiệu lực'}',
              ),
              Wrap(
                spacing: 8,
                children: [
                  TextButton(
                    onPressed: () async {
                      await Clipboard.setData(
                        ClipboardData(text: '${row['coupon_code']}'),
                      );
                    },
                    child: const Text('Sao chép'),
                  ),
                  FilledButton(
                    onPressed: !valid || busy
                        ? null
                        : () => context.push(
                            Uri(
                              path: '/checkout',
                              queryParameters: {
                                'coupon': '${row['coupon_code']}',
                              },
                            ).toString(),
                          ),
                    child: const Text('Dùng voucher'),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }
    if (_tab == 'transactions') {
      return Card(
        child: ListTile(
          title: Text('${row['points']} điểm · ${valueLabel(row['kind'])}'),
          subtitle: Text(
            '${row['description'] ?? ''}\n${date(row['created_at'])}',
          ),
        ),
      );
    }
    const statuses = {
      'OPEN': 'Đã gửi',
      'IN_REVIEW': 'Đang xử lý',
      'RESOLVED': 'Đã giải quyết',
      'REJECTED': 'Từ chối',
    };
    return Card(
      child: ListTile(
        title: Text(statuses[row['status']] ?? valueLabel(row['status'])),
        subtitle: Text(
          '${row['message']}\n${row['response'] ?? 'Chưa có phản hồi'}',
        ),
      ),
    );
  }

  Widget _complaintForm(bool busy) => Form(
    key: _form,
    child: Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: _type,
          decoration: const InputDecoration(labelText: 'Loại yêu cầu'),
          items: const [
            DropdownMenuItem(
              value: 'MISSING_POINTS',
              child: Text('Thiếu điểm'),
            ),
            DropdownMenuItem(value: 'WRONG_POINTS', child: Text('Sai điểm')),
            DropdownMenuItem(value: 'TIER', child: Text('Hạng thành viên')),
            DropdownMenuItem(value: 'REDEMPTION', child: Text('Đổi thưởng')),
            DropdownMenuItem(value: 'OTHER', child: Text('Khác')),
          ],
          onChanged: busy ? null : (v) => setState(() => _type = v!),
        ),
        TextFormField(
          controller: _order,
          enabled: !busy,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Mã đơn hàng (nếu có)'),
          validator: (v) =>
              v == null ||
                  v.trim().isEmpty ||
                  RegExp(r'^[1-9][0-9]*$').hasMatch(v.trim())
              ? null
              : 'Mã đơn phải là số dương',
        ),
        TextFormField(
          controller: _message,
          enabled: !busy,
          minLines: 3,
          maxLines: 5,
          maxLength: 2000,
          decoration: const InputDecoration(labelText: 'Nội dung'),
          validator: (v) =>
              (v ?? '').trim().length < 10 ? 'Nhập ít nhất 10 ký tự' : null,
        ),
        FilledButton(
          onPressed: busy ? null : _complain,
          child: const Text('Gửi yêu cầu'),
        ),
      ],
    ),
  );
}
