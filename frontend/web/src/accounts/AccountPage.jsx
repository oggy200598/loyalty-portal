import { valueLabel } from '../common/format';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../common/api';
import AddressBook from './AddressBook';
import { useAuth } from './authContext';

function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();
  if (location.pathname === '/tai-khoan/ho-so') return <ProfileForm />;
  if (location.pathname === '/tai-khoan/dia-chi') return <AddressBook />;

  // Menu theo role — BUYER đầy đủ, SELLER/ADMIN trỏ về portal của họ
  const isBuyer = !user?.role || user.role === 'BUYER';

  const MENU = isBuyer
    ? [
        { to: '/khach-hang-than-thiet', icon: 'bi-gem', title: 'Khách hàng thân thiết', desc: 'Điểm thưởng, hạng thành viên và ưu đãi của bạn' },
        {
          to: '/don-hang',
          icon: 'bi-receipt',
          title: 'Đơn hàng của tôi',
          desc: 'Theo dõi và quản lý đơn hàng',
        },
        {
          to: '/yeu-thich',
          icon: 'bi-heart',
          title: 'Sản phẩm yêu thích',
          desc: 'Danh sách sản phẩm đã thích',
        },
        {
          to: '/ma-giam-gia',
          icon: 'bi-ticket-perforated',
          title: 'Phiếu ưu đãi của tôi',
          desc: 'Xem và lưu phiếu ưu đãi khuyến mãi',
        },
        {
          to: '/thong-bao',
          icon: 'bi-bell',
          title: 'Thông báo',
          desc: 'Đơn hàng, khuyến mãi, trí tuệ nhân tạo gợi ý',
        },
        {
          to: '/tai-khoan/ho-so',
          icon: 'bi-person',
          title: 'Hồ sơ cá nhân',
          desc: 'Cập nhật họ tên, số điện thoại',
        },
        {
          to: '/tai-khoan/dia-chi',
          icon: 'bi-geo-alt',
          title: 'Địa chỉ nhận hàng',
          desc: 'Quản lý địa chỉ giao hàng mặc định',
        },
      ]
    : [
        {
          to: user.role === 'ADMIN' ? '/quan-tri' : '/nguoi-ban',
          icon: 'bi-speedometer2',
          title: user.role === 'ADMIN' ? "Tổng quan quản trị" : "Tổng quan bán hàng",
          desc: 'Về trang quản lý quản trị của bạn',
        },
        {
          to: '/thong-bao',
          icon: 'bi-bell',
          title: 'Thông báo',
          desc: 'Đơn hàng, cảnh báo rủi ro',
        },
        {
          to: '/tai-khoan/ho-so',
          icon: 'bi-person',
          title: 'Hồ sơ cá nhân',
          desc: 'Cập nhật thông tin tài khoản',
        },
      ];

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      {/* Profile card */}
      <div
        className="d-flex align-items-center gap-3 bg-white rounded-3 border p-3 mb-3"
        style={{ borderColor: '#f1f1f1' }}
      >
        <div
          className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
          style={{
            width: 64,
            height: 64,
            background: user?.role === 'ADMIN' ? '#6366f1' : '#ee4d2d',
            fontSize: 26,
          }}
        >
          {(user?.name ?? 'R').charAt(0).toUpperCase()}
        </div>

        <div>
          <h1 className="h6 fw-bold mb-0">{user?.name ?? 'Người dùng RiskMind'}</h1>
          <small className="text-muted d-block">
            {user?.email ?? '—'}
            {user?.role ? ` · ${valueLabel(user.role)}` : ''}
          </small>
        </div>

        <button
          type="button"
          className="btn btn-sm ms-auto"
          style={{ border: '1.5px solid #ee4d2d', color: '#ee4d2d' }}
          onClick={() => {
            logout();
            navigate('/dang-nhap', { replace: true });
          }}
        >
          Đăng xuất
        </button>
      </div>

      {/* Menu */}
      <Link to="/tai-khoan/mat-khau" className="btn btn-outline-secondary mb-3">Đổi mật khẩu</Link>
      <div className="row g-3">
        {MENU.map((item) => (
          <div key={item.to} className="col-12 col-md-6">
            <Link
              to={item.to}
              className="d-flex align-items-center gap-3 text-decoration-none bg-white rounded-3 border p-3 h-100 acc-item"
              style={{ borderColor: '#f1f1f1' }}
            >
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  background: '#fff3ef',
                  color: '#ee4d2d',
                  fontSize: 19,
                }}
              >
                <i className={`bi ${item.icon}`} />
              </div>

              <div>
                <div className="fw-semibold text-dark small">{item.title}</div>
                <small className="text-muted">{item.desc}</small>
              </div>

              <i className="bi bi-chevron-right ms-auto text-muted" />
            </Link>
          </div>
        ))}
      </div>

      <style>{`
        .acc-item { transition: box-shadow .15s ease; }
        .acc-item:hover { box-shadow: 0 6px 20px rgba(238, 77, 45, .12); }
      `}</style>
    </div>
  );
}

export default AccountPage;

function ProfileForm() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function load() {
    setBusy(true); setError(''); setSaved(false);
    try {
      const current = await api.getProfile();
      setProfile(current); setName(current.name); setPhone(current.phone ?? '');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    api.getProfile().then(current => {
      if (active) { setProfile(current); setName(current.name); setPhone(current.phone ?? ''); }
    }).catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      const current = await api.updateProfile({ fullName: name.trim(), phone: phone.trim(), expectedUpdatedAt: profile.updatedAt });
      setProfile(current); setName(current.name); setPhone(current.phone ?? '');
      await refreshUser(); setSaved(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <main className="container py-4" style={{ maxWidth: 640 }}>
    <Link to="/tai-khoan">← Tài khoản</Link>
    <h1 className="h4 mt-3">Hồ sơ cá nhân</h1>
    <p className="text-muted">Thông tin này dùng chung trên web và ứng dụng.</p>
    {error && <div role="alert" className="alert alert-danger">{error}</div>}
    {saved && <div role="status" className="alert alert-success">Đã lưu thông tin.</div>}
    {profile && <form onSubmit={save} className="bg-white border rounded p-4">
      <label className="form-label" htmlFor="profile-email">Tài khoản</label>
      <input id="profile-email" className="form-control mb-3" value={profile.email} disabled />
      <label className="form-label" htmlFor="profile-name">Họ tên</label>
      <input id="profile-name" name="fullName" className="form-control mb-3" value={name} onChange={e => setName(e.target.value)} required maxLength={255} disabled={busy} />
      <label className="form-label" htmlFor="profile-phone">Số điện thoại</label>
      <input id="profile-phone" name="phone" type="tel" className="form-control mb-3" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} pattern="[+0-9 ()\\-]*" disabled={busy} />
      <button className="btn btn-primary" disabled={busy || !name.trim()}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>}
    <button type="button" className="btn btn-link mt-2" onClick={load} disabled={busy}>Tải lại từ máy chủ</button>
  </main>;
}
