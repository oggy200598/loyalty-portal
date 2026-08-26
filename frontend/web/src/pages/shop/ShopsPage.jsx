import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getShops();

        if (!active) return;
        setShops(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách shop',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="container py-4">
      <nav className="sh-breadcrumb">
        <Link to="/">
          <i className="bi bi-house-door" /> Trang chủ
        </Link>
        <i className="bi bi-chevron-right" />
        <span className="current">Tất cả shop</span>
      </nav>

      <div
        className="p-3 mb-3 bg-white rounded-3 border"
        style={{ borderColor: '#f1f5f9' }}
      >
        <h1 className="h5 fw-bold mb-0">Tất cả shop</h1>
        <small className="text-muted">
          {shops.length} shop
        </small>
      </div>

      {loading && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Đang tải danh sách shop...
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-danger py-5 bg-white rounded-3 border">
          {error}
        </div>
      )}

      {!loading && !error && shops.length === 0 && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Chưa có shop nào
        </div>
      )}

      {!loading && !error && shops.length > 0 && (
        <div className="row g-3">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="col-12 col-md-6 col-lg-4"
            >
              <Link
                to={`/shops/${shop.id}`}
                className="d-flex align-items-center gap-3 text-decoration-none bg-white rounded-3 border p-3 h-100 sh-card"
                style={{ borderColor: '#f1f1f1' }}
              >
                {shop.logoUrl ? (
                  <img
                    src={shop.logoUrl}
                    alt=""
                    className="rounded-circle flex-shrink-0"
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fw-bold text-white"
                    style={{
                      width: 64,
                      height: 64,
                      background: '#ee4d2d',
                      fontSize: 24,
                    }}
                  >
                    {(shop.name ?? 'S')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="fw-semibold text-dark text-truncate">
                    {shop.name}
                  </div>

                  <small
                    className="text-muted d-block"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {shop.description ??
                      'Chưa có mô tả'}
                  </small>

                  <small style={{ color: '#ee4d2d' }}>
                    {shop.productCount} sản phẩm
                  </small>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .sh-breadcrumb {
          display: flex; align-items: center; gap: 8px;
          font-size: 13.5px; color: #888; margin-bottom: 16px;
        }
        .sh-breadcrumb a { color: #888; text-decoration: none; }
        .sh-breadcrumb a:hover { color: #ee4d2d; }
        .sh-breadcrumb .current { color: #ee4d2d; font-weight: 600; }
        .sh-card { transition: transform .15s ease, box-shadow .15s ease; }
        .sh-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(238, 77, 45, .12);
        }
        .min-w-0 { min-width: 0; }
      `}</style>
    </div>
  );
}

export default ShopsPage;
