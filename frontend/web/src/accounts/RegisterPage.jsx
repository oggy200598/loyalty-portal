import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getRoleHome } from './authContext';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp. Vui lòng nhập lại.');
      return;
    }
    setLoading(true);

    try {
      await register({
        name: form.fullName,
        email: form.email,
        password: form.password,
        role: 'BUYER',
      });
      navigate(getRoleHome('BUYER'), { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signin-page">
      <nav className="signin-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Đăng ký</span></nav>
      <div className="signin-main">
        <section className="signin-intro" aria-labelledby="register-intro-title">
          <p className="signin-intro-label">KHÁCH HÀNG THÂN THIẾT</p>
          <h2 id="register-intro-title">Tạo tài khoản,<br />bắt đầu tích lũy quyền lợi.</h2>
          <p>Đăng ký tài khoản mua sắm để tham gia chương trình khách hàng thân thiết và quản lý các giao dịch của bạn.</p>
          <ul className="signin-benefits">
            <li><i className="bi bi-person-check" aria-hidden="true" /><div><h3>Tự động trở thành thành viên</h3><p>Hồ sơ thành viên được tạo ngay khi đăng ký thành công.</p></div></li>
            <li><i className="bi bi-coin" aria-hidden="true" /><div><h3>Tích điểm từ đơn hàng</h3><p>Theo dõi điểm thưởng và hạng thành viên trong tài khoản.</p></div></li>
            <li><i className="bi bi-ticket-perforated" aria-hidden="true" /><div><h3>Đổi điểm lấy ưu đãi</h3><p>Chọn phần thưởng phù hợp cho lần mua sắm tiếp theo.</p></div></li>
          </ul>
        </section>
        <section className="signin-card" aria-labelledby="register-title">
          <div className="signin-card-heading"><h1 id="register-title">Đăng ký tài khoản</h1><p>Nhập thông tin của bạn để tạo tài khoản mua sắm.</p></div>
          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <form className="signin-form" onSubmit={handleSubmit} aria-busy={loading}>
            <label htmlFor="register-name">Họ và tên</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              required
              placeholder="Nhập họ và tên"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            />
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="Nhập địa chỉ email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <label htmlFor="register-password">Mật khẩu</label>
            <div className="signin-password register-password">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="Tạo mật khẩu"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <button className="signin-reveal" type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button>
            </div>
            <label htmlFor="register-confirm">Xác nhận mật khẩu</label>
            <input id="register-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={event => setForm(prev => ({ ...prev, confirmPassword: event.target.value }))} />
            <button className="signin-submit" type="submit" disabled={loading}>
              {loading ? 'Đang đăng ký…' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="signin-register">
            Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
