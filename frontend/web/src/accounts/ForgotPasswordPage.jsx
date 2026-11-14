import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './authContext';
import { api } from '../common/api';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const response = await api.forgotPassword({ email: email.trim() });
      setSuccess(response.message || 'Nếu email khớp với tài khoản, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally { setLoading(false); }
  }

  return <div className="signin-page">
    <nav className="signin-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><Link to="/dang-nhap">Đăng nhập</Link><span aria-hidden="true">/</span><span aria-current="page">Quên mật khẩu</span></nav>
    <div className="signin-main">
      <section className="signin-intro" aria-labelledby="recovery-intro-title">
        <p className="signin-intro-label">TÀI KHOẢN CỦA BẠN</p>
        <h2 id="recovery-intro-title">Lấy lại quyền truy cập,<br />tiếp tục mua sắm.</h2>
        <p>Khôi phục mật khẩu để xem đơn hàng, điểm thưởng và các ưu đãi đã lưu trong tài khoản.</p>
        <ul className="signin-benefits">
          <li><i className="bi bi-envelope" aria-hidden="true" /><div><h3>Sử dụng email đã đăng ký</h3><p>Hướng dẫn khôi phục được gửi tới email của tài khoản.</p></div></li>
          <li><i className="bi bi-key" aria-hidden="true" /><div><h3>Đặt mật khẩu mới</h3><p>Mở liên kết trong email để tạo mật khẩu cho tài khoản.</p></div></li>
          <li><i className="bi bi-shield-check" aria-hidden="true" /><div><h3>Giữ an toàn cho tài khoản</h3><p>Không chia sẻ liên kết hoặc mã khôi phục với người khác.</p></div></li>
        </ul>
      </section>
      <section className="signin-card" aria-labelledby="recovery-title">
        <div className="signin-card-heading"><h1 id="recovery-title">Quên mật khẩu</h1><p>Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.</p></div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {success ? <>
          <div className="alert alert-success small" role="status">{success}</div>
          <p className="small text-muted">Vui lòng kiểm tra hộp thư đến và thư rác. Liên kết khôi phục chỉ có hiệu lực trong thời gian giới hạn.</p>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => { setSuccess(''); setError(''); }}>Nhập email khác</button>
        </> : <form className="signin-form" onSubmit={handleSubmit} aria-busy={loading}>
          <label htmlFor="recovery-email">Email đã đăng ký</label>
          <input id="recovery-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="Nhập địa chỉ email" disabled={loading} value={email} onChange={event => setEmail(event.target.value)} />
          <button className="signin-submit" type="submit" disabled={loading}>{loading ? 'Đang gửi…' : 'Gửi hướng dẫn khôi phục'}</button>
        </form>}
        <p className="signin-register">Đã nhớ mật khẩu? <Link to="/dang-nhap">Đăng nhập</Link></p>
      </section>
    </div>
  </div>;
}

export default ForgotPasswordPage;

export function ResetPasswordPage() { return <PasswordForm change={false} />; }
export function ChangePasswordPage() { return <PasswordForm change />; }
function PasswordForm({ change }) {
  const location = useLocation(), navigate = useNavigate();
  const { logout } = useAuth();
  const [token, setToken] = useState(() => location.hash.slice(1));
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => {
    if (!change && location.hash) window.history.replaceState(window.history.state, '', location.pathname + location.search);
  }, [change, location.hash, location.pathname, location.search]);
  async function save(event) {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Mật khẩu không được vượt quá 72 byte UTF-8.'); return; }
    setBusy(true);
    try {
      const response = await (change ? api.changePassword({ currentPassword, password }) : api.resetPassword({ token: token.trim(), password }));
      setSaved(response.message); setPassword(''); setConfirm(''); setCurrentPassword(''); setToken('');
      if (change) { logout(); navigate('/dang-nhap?password=changed', { replace: true }); }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <main className="container py-5" style={{ maxWidth: 520 }}><h1 className="h4">{change ? 'Đổi mật khẩu' : 'Đặt lại mật khẩu'}</h1>
    <p className="text-muted">Mật khẩu mới từ 8 ký tự. Sau khi lưu, các thiết bị cần đăng nhập lại.</p>
    {error && <div role="alert" className="alert alert-danger">{error}</div>}
    {saved ? <div role="status" className="alert alert-success">{saved}</div> : <form onSubmit={save}><fieldset disabled={busy}>
      {change ? <label className="d-block mb-3">Mật khẩu hiện tại<input className="form-control mt-1" name="currentPassword" type="password" autoComplete="current-password" required maxLength={72} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label> : <label className="d-block mb-3">Mã khôi phục<input className="form-control mt-1" name="token" autoComplete="off" required pattern="[a-f0-9]{64}" value={token} onChange={e => setToken(e.target.value)} maxLength={64} /></label>}
      <label className="d-block mb-3">Mật khẩu mới<input className="form-control mt-1" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label className="d-block mb-3">Nhập lại mật khẩu<input className="form-control mt-1" name="confirmPassword" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      <button className="btn btn-primary">{busy ? 'Đang lưu…' : 'Lưu mật khẩu'}</button>
    </fieldset></form>}
    <Link to="/dang-nhap" className="d-block mt-3">Về đăng nhập</Link>{!change && <Link to="/quen-mat-khau">Yêu cầu mã mới</Link>}
  </main>;
}
