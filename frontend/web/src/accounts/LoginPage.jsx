import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleHome } from './authContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(form);
      const role = response.user?.role;

      if (!['BUYER', 'SELLER', 'ADMIN'].includes(role)) {
        logout();
        navigate('/dang-nhap', { replace: true });
        return;
      }

      const from = location.state?.from;
      const path = from?.pathname;
      const target =
        path?.startsWith('/') && !path.startsWith('//') && !path.startsWith('/dang-nhap') && !path.startsWith('/dang-ky')
          ? { pathname: path, search: from.search ?? '', hash: from.hash ?? '' }
          : getRoleHome(role);

      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signin-page">
      <nav className="signin-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Đăng nhập</span></nav>
      <div className="signin-main">
        <section className="signin-intro" aria-labelledby="signin-intro-title">
          <p className="signin-intro-label">KHÁCH HÀNG THÂN THIẾT</p>
          <h2 id="signin-intro-title">Mỗi lần mua sắm,<br />thêm nhiều quyền lợi.</h2>
          <p>Tích điểm từ đơn hàng, theo dõi hạng thành viên và đổi điểm lấy ưu đãi ngay trên tài khoản mua sắm.</p>
          <ul className="signin-benefits">
            <li><i className="bi bi-coin" aria-hidden="true" /><div><h3>Tích điểm khi mua hàng</h3><p>Điểm thưởng được ghi nhận từ đơn hàng đủ điều kiện.</p></div></li>
            <li><i className="bi bi-person-badge" aria-hidden="true" /><div><h3>Quyền lợi theo hạng thành viên</h3><p>Xem hạng hiện tại và điều kiện để lên hạng tiếp theo.</p></div></li>
            <li><i className="bi bi-ticket-perforated" aria-hidden="true" /><div><h3>Đổi điểm lấy ưu đãi</h3><p>Sử dụng điểm để nhận mã giảm giá cho lần mua sau.</p></div></li>
          </ul>
        </section>
        <section className="signin-card" aria-labelledby="signin-title">
          <div className="signin-card-heading"><h1 id="signin-title">Đăng nhập</h1><p>Đăng nhập để mua sắm, theo dõi đơn hàng và sử dụng điểm thưởng.</p></div>
          {new URLSearchParams(location.search).get('password') === 'changed' && <div role="status" className="alert alert-success">Mật khẩu đã được đổi. Vui lòng đăng nhập lại.</div>}
          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <form className="signin-form" onSubmit={handleSubmit} aria-busy={loading}>
            <label htmlFor="signin-account">Tài khoản hoặc email</label>
            <input
              id="signin-account"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="Nhập tài khoản hoặc email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <label htmlFor="signin-password">Mật khẩu</label>
            <div className="signin-password">
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Nhập mật khẩu của bạn"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <button className="signin-reveal" type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button>
            </div>
            <Link className="signin-forgot" to="/quen-mat-khau">Quên mật khẩu?</Link>
            <button className="signin-submit" type="submit" disabled={loading}>
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
          <p className="signin-register">Chưa có tài khoản? <Link to="/dang-ky">Đăng ký ngay</Link></p>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
