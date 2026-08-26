import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { getRoleHome } from '../../auth/roles';

function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Menu theo role — BUYER đầy đủ, SELLER/ADMIN trỏ về portal của họ
  const isBuyer = !user?.role || user.role === 'BUYER';

  const MENU = isBuyer
    ? [
        {
          to: '/orders',
          icon: 'bi-receipt',
          title: 'Đơn hàng của tôi',
          desc: 'Theo dõi và quản lý đơn hàng',
        },
        {
          to: '/wishlist',
          icon: 'bi-heart',
          title: 'Sản phẩm yêu thích',
          desc: 'Danh sách sản phẩm đã thích',
        },
        {
          to: '/coupons',
          icon: 'bi-ticket-perforated',
          title: 'Voucher của tôi',
          desc: 'Xem và lưu voucher khuyến mãi',
        },
        {
          to: '/notifications',
          icon: 'bi-bell',
          title: 'Thông báo',
          desc: 'Đơn hàng, khuyến mãi, AI gợi ý',
        },
        {
          to: '/account/profile',
          icon: 'bi-person',
          title: 'Hồ sơ cá nhân',
          desc: 'Cập nhật tên, avatar, giới tính, ngày sinh',
        },
        {
          to: '/account/addresses',
          icon: 'bi-geo-alt',
          title: 'Địa chỉ nhận hàng',
          desc: 'Quản lý địa chỉ giao hàng mặc định',
        },
      ]
    : [
        {
          to: user.role === 'ADMIN' ? '/admin' : '/seller',
          icon: 'bi-speedometer2',
          title: user.role === 'ADMIN' ? 'Admin Dashboard' : 'Seller Dashboard',
          desc: 'Về portal quản trị của bạn',
        },
        {
          to: '/notifications',
          icon: 'bi-bell',
          title: 'Thông báo',
          desc: 'Đơn hàng, cảnh báo rủi ro',
        },
        {
          to: '/account/profile',
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
            {user?.role ? ` · ${user.role}` : ''}
          </small>
        </div>

        <button
          type="button"
          className="btn btn-sm ms-auto"
          style={{ border: '1.5px solid #ee4d2d', color: '#ee4d2d' }}
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          Đăng xuất
        </button>
      </div>

      {/* Menu */}
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
