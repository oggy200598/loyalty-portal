import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../common/theme.dart';
import 'auth_provider.dart';
import 'dart:convert';
import '../common/api_client.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class PasswordScreen extends StatefulWidget {
  final bool change;
  const PasswordScreen({super.key, this.change = false});
  @override
  State<PasswordScreen> createState() => _PasswordScreenState();
}

class _PasswordScreenState extends State<PasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _token = TextEditingController(),
      _current = TextEditingController(),
      _password = TextEditingController(),
      _confirm = TextEditingController();
  bool _busy = false;
  String? _error, _saved;
  String get token => _token.text.trim().split('#').last;
  @override
  void dispose() {
    for (final c in [_token, _current, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result =
          await context.read<ApiClient>().post(
                widget.change
                    ? '/auth/change-password'
                    : '/auth/reset-password',
                {
                  'password': _password.text,
                  if (widget.change)
                    'currentPassword': _current.text
                  else
                    'token': token,
                },
              )
              as Map<String, dynamic>;
      if (!mounted) return;
      setState(() => _saved = '${result['message']}');
      _password.clear();
      _confirm.clear();
      _current.clear();
      _token.clear();
      if (widget.change) {
        await auth.logout();
        if (mounted) context.go('/login');
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.change ? 'Đổi mật khẩu' : 'Đặt lại mật khẩu'),
    ),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Mật khẩu mới từ 8 ký tự. Sau khi lưu, các thiết bị cần đăng nhập lại.',
            ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_saved != null)
              Text(_saved!)
            else ...[
              if (widget.change)
                TextFormField(
                  controller: _current,
                  enabled: !_busy,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  decoration: const InputDecoration(
                    labelText: 'Mật khẩu hiện tại',
                  ),
                  validator: (v) =>
                      (v ?? '').isEmpty ? 'Nhập mật khẩu hiện tại' : null,
                )
              else
                TextFormField(
                  controller: _token,
                  enabled: !_busy,
                  maxLength: 2048,
                  decoration: const InputDecoration(
                    labelText: 'Mã khôi phục hoặc liên kết từ thư',
                  ),
                  validator: (_) => RegExp(r'^[a-f0-9]{64}$').hasMatch(token)
                      ? null
                      : 'Mã khôi phục cần đủ 64 ký tự',
                ),
              TextFormField(
                controller: _password,
                enabled: !_busy,
                obscureText: true,
                maxLength: 72,
                autofillHints: const [AutofillHints.newPassword],
                decoration: const InputDecoration(labelText: 'Mật khẩu mới'),
                validator: (v) => (v ?? '').length < 8
                    ? 'Nhập ít nhất 8 ký tự'
                    : utf8.encode(v!).length > 72
                    ? 'Không vượt quá 72 byte UTF-8'
                    : null,
              ),
              TextFormField(
                controller: _confirm,
                enabled: !_busy,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Nhập lại mật khẩu',
                ),
                validator: (v) =>
                    v != _password.text ? 'Mật khẩu xác nhận không khớp' : null,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: Text(_busy ? 'Đang lưu…' : 'Lưu mật khẩu'),
              ),
            ],
            if (!widget.change)
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Về đăng nhập'),
              ),
          ],
        ),
      ),
    ),
  );
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();

  bool _sent = false;
  bool _loading = false;
  String? _error;
  String _sentMessage = '';

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();

    if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(email)) {
      setState(() => _error = 'Email không hợp lệ');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Dùng client từ AuthProvider để gọi API.
      final auth = context.read<AuthProvider>();
      final service = AuthService(auth.createClient());
      final response = await service.forgotPassword(email);

      if (mounted) {
        setState(() {
          _sent = true;
          _sentMessage = '${response['message']}';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = errorMessage(error);
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quên mật khẩu')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextButton(
                  onPressed: () => context.push('/reset-password'),
                  child: const Text('Đã có mã khôi phục? Đặt lại mật khẩu'),
                ),
                const Icon(
                  Icons.key_outlined,
                  size: 56,
                  color: AppColors.accent,
                ),

                const SizedBox(height: 12),

                const Center(
                  child: Text(
                    'Nhập email để nhận hướng dẫn\nđặt lại mật khẩu',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                if (_sent)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: .08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _sentMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.success,
                        fontSize: 13.5,
                      ),
                    ),
                  )
                else ...[
                  TextField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: 'Email',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                  ),

                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 13,
                        ),
                      ),
                    ),

                  const SizedBox(height: 16),

                  ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Gửi yêu cầu'),
                  ),
                ],

                const SizedBox(height: 16),

                Center(
                  child: TextButton(
                    onPressed: () => context.push('/login'),
                    child: const Text(
                      'Quay lại đăng nhập',
                      style: TextStyle(color: AppColors.accent),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
