import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const NAV_ITEMS = [
  { to: '/seller', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
  { to: '/seller/products', label: 'Sản phẩm', icon: 'bi-box-seam' },
  { to: '/seller/orders', label: 'Đơn hàng', icon: 'bi-receipt' },
  { to: '/seller/coupons', label: 'Coupon', icon: 'bi-ticket-perforated' },
  { to: '/seller/analytics', label: 'Phân tích', icon: 'bi-graph-up' },
  { to: '/seller/risk', label: 'Risk', icon: 'bi-shield-exclamation' },
];

function SellerLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="portal-shell portal-seller">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <div className="portal-logo">R</div>
          <div>
            <strong>RiskMind AI</strong>
            <small className="d-block text-muted">Seller Portal</small>
          </div>
        </div>

        <nav className="portal-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `portal-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <i className={`bi ${item.icon}`} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="portal-sidebar-foot">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary w-100 mb-2"
            onClick={() => navigate('/')}
            title="Mở buyer portal (chủ động)"
          >
            <i className="bi bi-shop me-1" />
            Đi tới trang mua sắm
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger w-100"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <i className="bi bi-box-arrow-right me-1" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-header">
          <span className="badge text-bg-warning">SELLER</span>
          <div className="ms-auto d-flex align-items-center gap-3">
            <NavLink to="/seller/settings" className="portal-account">
              <i className="bi bi-person-circle me-1" />
              {user?.name ?? user?.email ?? 'Tài khoản'}
            </NavLink>
          </div>
        </header>

        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default SellerLayout;
