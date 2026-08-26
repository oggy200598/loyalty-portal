import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

const ICONS = [
  'bi-phone',
  'bi-bag',
  'bi-laptop',
  'bi-house',
  'bi-tools',
  'bi-stars',
  'bi-basket',
  'bi-flower1',
  'bi-egg-fried',
  'bi-heart-pulse',
  'bi-controller',
  'bi-three-dots',
];

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getCategories();

        if (!active) return;
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh mục',
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
      <nav className="cat-breadcrumb">
        <Link to="/">
          <i className="bi bi-house-door" /> Trang chủ
        </Link>
        <i className="bi bi-chevron-right" />
        <span className="current">Tất cả danh mục</span>
      </nav>

      <div
        className="p-3 mb-3 bg-white rounded-3 border"
        style={{ borderColor: '#f1f5f9' }}
      >
        <h1 className="h5 fw-bold mb-0">
          Tất cả danh mục
        </h1>
        <small className="text-muted">
          {categories.length} danh mục
        </small>
      </div>

      {loading && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Đang tải danh mục...
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-danger py-5 bg-white rounded-3 border">
          {error}
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Chưa có danh mục
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="row g-3">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="col-6 col-md-4 col-lg-3"
            >
              <Link
                to={`/categories/${category.id}`}
                className="d-block h-100 text-decoration-none bg-white rounded-3 border p-4 text-center cat-item"
                style={{ borderColor: '#f1f5f9' }}
              >
                <div
                  className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: 64,
                    height: 64,
                    background: '#fff3ef',
                    color: '#ee4d2d',
                    fontSize: 26,
                  }}
                >
                  <i
                    className={`bi ${
                      ICONS[index % ICONS.length]
                    }`}
                  />
                </div>

                <div
                  className="fw-semibold text-dark"
                  style={{ fontSize: 14 }}
                >
                  {category.name}
                </div>

                {category.productCount != null && (
                  <small className="text-muted">
                    {category.productCount} sản phẩm
                  </small>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .cat-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #888;
          margin-bottom: 16px;
        }
        .cat-breadcrumb a { color: #888; text-decoration: none; }
        .cat-breadcrumb a:hover { color: #ee4d2d; }
        .cat-breadcrumb .current { color: #ee4d2d; font-weight: 600; }
        .cat-item { transition: transform .15s ease, box-shadow .15s ease; }
        .cat-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(238, 77, 45, .12);
          color: #ee4d2d !important;
        }
      `}</style>
    </div>
  );
}

export default CategoriesPage;
