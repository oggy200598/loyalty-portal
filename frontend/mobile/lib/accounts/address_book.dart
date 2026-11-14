import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../common/api_client.dart';

const _fields = {
  'receiverName': 'Người nhận',
  'phone': 'Điện thoại',
  'province': 'Tỉnh / thành phố',
  'ward': 'Phường / xã',
  'district': 'Quận / huyện (nếu có)',
  'addressDetail': 'Số nhà, đường',
};
Map<String, dynamic> _draft(Map<String, dynamic> row) => {
  'receiverName': row['receiver_name'],
  'phone': row['phone'],
  'province': row['province'],
  'ward': row['ward'],
  'district': row['district'],
  'addressDetail': row['address_detail'],
  'isDefault': row['is_default'],
  'version': row['version'],
};
String addressText(Map row) => [
  row['address_detail'],
  row['ward'],
  row['district'],
  row['province'],
].where((v) => v != null && '$v'.isNotEmpty).join(', ');

class AddressBookScreen extends StatefulWidget {
  const AddressBookScreen({super.key});
  @override
  State<AddressBookScreen> createState() => _AddressBookScreenState();
}

class _AddressBookScreenState extends State<AddressBookScreen> {
  List<Map<String, dynamic>> _rows = [];
  bool _busy = false;
  String? _error;
  ApiClient get client => context.read<ApiClient>();
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final rows = (await client.get('/users/me/addresses') as List)
          .cast<Map<String, dynamic>>();
      if (mounted) setState(() => _rows = rows);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _edit([Map<String, dynamic>? row]) async {
    final saved = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _AddressEditor(client: client, row: row),
    );
    if (saved == true && mounted) await _load();
  }

  Future<void> _delete(Map<String, dynamic> row) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa địa chỉ?'),
        content: const Text('Thông tin giao hàng của đơn cũ vẫn được giữ.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await client.delete(
        '/users/me/addresses/${row['id']}?version=${row['version']}',
      );
      if (mounted) await _load();
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Sổ địa chỉ'),
      actions: [
        IconButton(
          tooltip: 'Tải lại',
          onPressed: _busy ? null : _load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: RefreshIndicator(
      onRefresh: () async {
        if (!_busy) await _load();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (_busy) const LinearProgressIndicator(),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          FilledButton(
            onPressed: _busy || _rows.length >= 20 ? null : _edit,
            child: const Text('Thêm địa chỉ'),
          ),
          if (!_busy && _rows.isEmpty) const Text('Chưa có địa chỉ.'),
          for (final row in _rows)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${row['receiver_name']} · ${row['phone']}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(addressText(row)),
                    if (row['is_default'] == true) const Text('Mặc định'),
                    Wrap(
                      children: [
                        TextButton(
                          onPressed: _busy ? null : () => _edit(row),
                          child: const Text('Sửa'),
                        ),
                        TextButton(
                          onPressed: _busy ? null : () => _delete(row),
                          child: const Text('Xóa'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

class _AddressEditor extends StatefulWidget {
  final ApiClient client;
  final Map<String, dynamic>? row;
  const _AddressEditor({required this.client, this.row});
  @override
  State<_AddressEditor> createState() => _AddressEditorState();
}

class _AddressEditorState extends State<_AddressEditor> {
  final _form = GlobalKey<FormState>();
  late Map<String, TextEditingController> _controllers;
  bool _default = false, _busy = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    final data = widget.row == null ? {} : _draft(widget.row!);
    _controllers = {
      for (final key in _fields.keys)
        key: TextEditingController(text: data[key] ?? ''),
    };
    _default = data['isDefault'] == true;
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final payload = <String, dynamic>{
        for (final field in _controllers.entries)
          field.key: field.value.text.trim(),
        'isDefault': _default,
        if (widget.row != null) 'version': widget.row!['version'],
      };
      if (widget.row == null) {
        await widget.client.post('/users/me/addresses', payload);
      } else {
        await widget.client.patch(
          '/users/me/addresses/${widget.row!['id']}',
          payload,
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: Text(widget.row == null ? 'Thêm địa chỉ' : 'Sửa địa chỉ'),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Form(
            key: _form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                for (final entry in _fields.entries)
                  TextFormField(
                    controller: _controllers[entry.key],
                    enabled: !_busy,
                    decoration: InputDecoration(labelText: entry.value),
                    keyboardType: entry.key == 'phone'
                        ? TextInputType.phone
                        : TextInputType.text,
                    maxLength: entry.key == 'addressDetail'
                        ? 500
                        : entry.key == 'receiverName'
                        ? 255
                        : entry.key == 'phone'
                        ? 10
                        : 100,
                    validator: (v) => entry.key == 'district'
                        ? null
                        : entry.key == 'phone'
                        ? (RegExp(r'^0\d{9}$').hasMatch((v ?? '').trim())
                              ? null
                              : 'Nhập 10 số, bắt đầu bằng 0')
                        : (v ?? '').trim().isEmpty
                        ? 'Không được để trống'
                        : null,
                  ),
                CheckboxListTile(
                  title: const Text('Địa chỉ mặc định'),
                  value: _default,
                  onChanged: _busy || widget.row?['is_default'] == true
                      ? null
                      : (value) => setState(() => _default = value!),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: _busy ? null : _save,
          child: Text(_busy ? 'Đang lưu…' : 'Lưu địa chỉ'),
        ),
      ],
    ),
  );
}

class AddressPicker extends StatefulWidget {
  final ApiClient client;
  final void Function(Map<String, dynamic>, bool) onSelect;
  const AddressPicker({
    super.key,
    required this.client,
    required this.onSelect,
  });
  @override
  State<AddressPicker> createState() => _AddressPickerState();
}

class _AddressPickerState extends State<AddressPicker> {
  List<Map<String, dynamic>> _rows = [];
  String? _selected, _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = (await widget.client.get('/users/me/addresses') as List)
          .cast<Map<String, dynamic>>();
      if (!mounted) return;
      final first = rows.where((r) => r['is_default'] == true).firstOrNull;
      setState(() {
        _rows = rows;
        _selected = first?['id'].toString();
      });
      if (first != null) widget.onSelect(first, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      DropdownButtonFormField<String>(
        key: ValueKey(_selected),
        initialValue: _selected,
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Địa chỉ đã lưu'),
        items: [
          const DropdownMenuItem(value: '', child: Text('Nhập địa chỉ khác')),
          ..._rows.map(
            (row) => DropdownMenuItem(
              value: '${row['id']}',
              child: Text(
                '${row['receiver_name']} — ${row['address_detail']}',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
        ],
        onChanged: (id) {
          setState(() => _selected = id);
          final row = _rows.where((r) => '${r['id']}' == id).firstOrNull;
          if (row != null) widget.onSelect(row, false);
        },
      ),
      if (_error != null)
        Text(
          'Không tải được sổ địa chỉ: $_error',
          style: const TextStyle(color: Colors.red),
        ),
    ],
  );
}
