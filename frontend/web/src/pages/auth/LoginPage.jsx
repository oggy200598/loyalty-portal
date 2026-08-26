import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { getRoleHome } from '../../auth/roles';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(form);
      const role = response.user?.role;

      // Role không hợp lệ → logout + về /login
      if (!['BUYER', 'SELLER', 'ADMIN'].includes(role)) {
        logout();
        navigate('/login', { replace: true });
        return;
      }

      // Redirect theo role — KHÔNG redirect tất cả về "/"
      // Chỉ quay lại trang "from" nếu user đã chủ động đi tới đó.
      const from = location.state?.from?.pathname;
      const target =
        from && !from.startsWith('/login') && !from.startsWith('/register')
          ? from
          : getRoleHome(role);

      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo">R</div>
          <h1>Đăng nhập</h1>
          <p>Dùng tài khoản demo buyer@riskmind.ai, seller@riskmind.ai, admin@riskmind.ai</p>
        </div>

        <div className="auth-body">
          {error ? <div className="auth-error">{error}</div> : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              className="auth-input"
              type="password"
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="auth-foot">
            Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
