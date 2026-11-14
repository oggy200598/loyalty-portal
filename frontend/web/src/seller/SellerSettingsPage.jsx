import { useAuth } from '../accounts/authContext';

function SellerSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="mb-3">Cài đặt người bán</h1>

      <div className="bg-white rounded-3 border p-3 mb-3" style={{ borderColor: '#e5e7eb' }}>
        <h2 className="h6 fw-bold mb-3">Tài khoản</h2>
        <dl className="row small mb-0">
          <dt className="col-4 text-muted">Tên</dt>
          <dd className="col-8">{user?.name ?? '—'}</dd>
          <dt className="col-4 text-muted">Thư điện tử</dt>
          <dd className="col-8">{user?.email ?? '—'}</dd>
          <dt className="col-4 text-muted">Vai trò</dt>
          <dd className="col-8">
            <span className="badge text-bg-warning">Người bán</span>
          </dd>
        </dl>
      </div>

      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={() => logout()}
      >
        <i className="bi bi-box-arrow-right me-1" />
        Đăng xuất
      </button>
    </div>
  );
}

export default SellerSettingsPage;
