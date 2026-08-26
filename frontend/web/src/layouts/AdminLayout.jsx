import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
  { to: '/admin/users', label: 'Users', icon: 'bi-people' },
  { to: '/admin/sellers', label: 'Sellers', icon: 'bi-person-badge' },
  { to: '/admin/shops', label: 'Shops', icon: 'bi-shop' },
  { to: '/admin/categories', label: 'Categories', icon: 'bi-grid' },
  { to: '/admin/products', label: 'Products', icon: 'bi-box-seam' },
  { to: '/admin/orders', label: 'Orders', icon: 'bi-receipt' },
  { to: '/admin/coupons', label: 'Coupons', icon: 'bi-ticket-perforated' },
  { to: '/admin/risk', label: 'Risk', icon: 'bi-shield-exclamation' },
  { to: '/admin/models', label: 'ML Models', icon: 'bi-cpu' },
  { to: '/admin/recommendations', label: 'Recommendations', icon: 'bi-stars' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'bi-journal-text' },
  { to: '/admin/settings', label: 'Settings', icon: 'bi-gear' },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="portal-shell portal-admin">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <div className="portal-logo portal-logo-admin">R</div>
          <div>
            <strong>RiskMind AI</strong>
            <small className="d-block text-muted">Admin Portal</small>
          </div>
        </div>

        <nav className="portal-nav portal-nav-scroll">
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
            title="Xem buyer portal (chủ động)"
          >
            <i className="bi bi-shop me-1" />
            Xem trang mua sắm
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
          <span className="badge text-bg-dark">ADMIN</span>
          <div className="ms-auto d-flex align-items-center gap-3">
            <NavLink to="/admin/settings" className="portal-account">
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

export default AdminLayout;
