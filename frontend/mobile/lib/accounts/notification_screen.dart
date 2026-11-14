import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../common/api_client.dart';
import '../common/format.dart';
import '../common/notification_feed.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});
  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<Map<String, dynamic>> _rows = [];
  int _page = 1, _pages = 1, _unread = 0;
  bool _busy = false;
  String? _error;
  NotificationFeed? _feed;
  bool _pending = false;
  ApiClient get client => context.read<ApiClient>();
  @override
  void initState() {
    super.initState();
    _feed = context.read<NotificationFeed?>();
    _feed?.addListener(_changed);
    _load();
  }

  void _changed() {
    if (_busy) {
      _pending = true;
    } else {
      _load();
    }
  }

  @override
  void dispose() {
    _feed?.removeListener(_changed);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data =
          await client.get('/notifications?page=$_page&limit=20')
              as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _rows = (data['data'] as List).cast<Map<String, dynamic>>();
        _pages = (data['pagination']['totalPages'] as num).toInt();
        _unread = (data['unreadCount'] as num).toInt();
      });
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        if (_pending) {
          _pending = false;
          _load();
        }
      }
    }
  }

  Future<void> _read(String? id) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await client.patch(
        id == null ? '/notifications/read-all' : '/notifications/$id/read',
        {},
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
      title: Text('Thông báo ($_unread chưa đọc)'),
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
        padding: const EdgeInsets.all(12),
        children: [
          TextButton(
            onPressed: _busy || _unread == 0 ? null : () => _read(null),
            child: const Text('Đánh dấu tất cả đã đọc'),
          ),
          if (_busy) const LinearProgressIndicator(),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          if (!_busy && _rows.isEmpty) const Text('Chưa có thông báo.'),
          for (final row in _rows)
            Card(
              child: ListTile(
                leading: Icon(
                  row['is_read'] == true
                      ? Icons.notifications_none
                      : Icons.notifications_active,
                  color: row['is_read'] == true
                      ? Colors.grey
                      : Theme.of(context).colorScheme.primary,
                ),
                title: Text('${row['title']}'),
                subtitle: Text(notificationText('${row['message']}')),
                isThreeLine: true,
                onTap: _busy || row['is_read'] == true
                    ? null
                    : () => _read('${row['id']}'),
              ),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                tooltip: 'Trang trước',
                onPressed: _busy || _page <= 1
                    ? null
                    : () {
                        _page--;
                        _load();
                      },
                icon: const Icon(Icons.chevron_left),
              ),
              Text('Trang $_page / ${_pages < 1 ? 1 : _pages}'),
              IconButton(
                tooltip: 'Trang sau',
                onPressed: _busy || _page >= _pages
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
