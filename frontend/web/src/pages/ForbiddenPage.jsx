import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getRoleHome } from '../auth/roles';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = getRoleHome(user?.role);

  return (
    <div className="forbidden-page">
      <div className="forbidden-card">
        <div className="forbidden-badge">403</div>
        <h1>Bạn không có quyền truy cập trang này.</h1>
        <p>Vui lòng quay lại portal phù hợp với quyền của bạn.</p>
        <div className="forbidden-actions">
          <Link to={home} className="btn btn-primary">Về trang phù hợp</Link>
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
