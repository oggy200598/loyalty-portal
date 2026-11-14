import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../accounts/authContext';
import './management.css';

function ManagementLayout({ home, title, section, navItems, variant }) {
  const groups = [...new Set(navItems.map((item) => item.group))];
  const navigate = useNavigate();
  const { user, logout, unreadCount = 0 } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = navItems.find((item) => item.end ? pathname === item.to : pathname.startsWith(item.to));

  return (
    <div className={`portal-shell portal-management portal-${variant}${menuOpen ? ' admin-menu-open' : ''}`}>
      <a href="#admin-content" className="admin-skip-link">Đến nội dung chính</a>
      {menuOpen && <button className="admin-menu-backdrop" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <aside className="portal-sidebar" id="admin-navigation">
        <div className="portal-brand">
          <div className="portal-logo portal-logo-admin">R</div>
          <div>
            <strong>RiskMind</strong>
            <small className="d-block text-muted">{title}</small>
          </div>
        </div>

        <nav className="portal-nav portal-nav-scroll" aria-label={`Menu ${section}`}>
          {groups.map((group) => <div className="admin-nav-group" key={group}>
          <div className="admin-nav-label">{group}</div>
          {navItems.filter((item) => item.group === group).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `portal-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
          </div>)}
        </nav>

        <div className="portal-sidebar-foot">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary w-100 mb-2"
            onClick={() => navigate('/')}
            title="Mở trang mua sắm"
          >
            <i className="bi bi-shop me-1" />
            Về cửa hàng
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger w-100"
            onClick={() => {
              logout();
              navigate('/dang-nhap', { replace: true });
            }}
          >
            <i className="bi bi-box-arrow-right me-1" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-header">
          <button type="button" className="admin-menu-toggle" aria-label={`Mở menu ${section}`} aria-controls="admin-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><i className="bi bi-list" aria-hidden="true" /></button>
          <nav className="admin-breadcrumb" aria-label="Đường dẫn"><Link to={home}>{section}</Link><span aria-hidden="true">/</span><span aria-current="page">{current?.label ?? 'Chi tiết'}</span></nav>
          <div className="ms-auto d-flex align-items-center gap-3">
            <Link to="/thong-bao" aria-label={`Thông báo, ${unreadCount} chưa đọc`} className="text-secondary"><i className="bi bi-bell" />{unreadCount > 0 && <span className="badge text-bg-danger ms-1">{unreadCount}</span>}</Link>
            <NavLink to={`${home}/cai-dat`} className="portal-account">
              <span className="admin-avatar" aria-hidden="true">{(user?.name || user?.email || 'A').charAt(0).toUpperCase()}</span>
              {user?.name ?? user?.email ?? 'Tài khoản'}
            </NavLink>
          </div>
        </header>

        <main className="portal-content" id="admin-content">
          <Suspense fallback={<p className="admin-loading" role="status">Đang tải nội dung...</p>}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}

export default ManagementLayout;
