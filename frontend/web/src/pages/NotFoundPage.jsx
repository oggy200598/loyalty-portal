import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-center"
      style={{ minHeight: '60vh', padding: '48px 16px' }}
    >
      <div style={{ fontSize: 96, fontWeight: 800, color: '#ee4d2d' }}>
        404
      </div>

      <h1 className="h4 mt-2 mb-1">
        Không tìm thấy trang
      </h1>

      <p className="text-muted mb-4">
        Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>

      <Link to="/" className="btn text-white px-4" style={{ background: '#ee4d2d' }}>
        Về trang chủ
      </Link>
    </div>
  );
}

export default NotFoundPage;
