import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../common/api';
import {
  formatCurrency,
  formatSold,
  normalizeText,
} from '../common/format';

function SearchPage() {
  const [searchParams] = useSearchParams();
  // Hỗ trợ cả ?q= và ?search= (Header đang submit ?search=)
  const query = (searchParams.get('q') ?? searchParams.get('search') ?? '').trim();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [priceFilter, setPriceFilter] = useState('all');
  const [sort, setSort] = useState('relevant');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getProducts(120);

        if (!active) return;
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải sản phẩm',
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

  const results = useMemo(() => {
    let list = products;

    if (query) {
      const normalized = normalizeText(query);
      list = list.filter((product) =>
        normalizeText(product.name).includes(normalized),
      );
    }

    if (priceFilter === 'under-100k') {
      list = list.filter(
        (p) => Number(p.price ?? 0) < 100_000,
      );
    } else if (priceFilter === '100k-500k') {
      list = list.filter(
        (p) =>
          Number(p.price ?? 0) >= 100_000 &&
          Number(p.price ?? 0) < 500_000,
      );
    } else if (priceFilter === 'above-500k') {
      list = list.filter(
        (p) => Number(p.price ?? 0) >= 500_000,
      );
    }

    if (sort === 'price-asc') {
      list = [...list].sort(
        (a, b) => Number(a.price ?? 0) - Number(b.price ?? 0),
      );
    } else if (sort === 'price-desc') {
      list = [...list].sort(
        (a, b) => Number(b.price ?? 0) - Number(a.price ?? 0),
      );
    } else if (sort === 'best-seller') {
      list = [...list].sort(
        (a, b) =>
          Number(b.soldQuantity ?? 0) -
          Number(a.soldQuantity ?? 0),
      );
    }

    return list;
  }, [products, query, priceFilter, sort]);

  return (
    <div className="container py-4">
      <nav className="sr-breadcrumb">
        <Link to="/">
          <i className="bi bi-house-door" /> Trang chủ
        </Link>
        <i className="bi bi-chevron-right" />
        <span className="current">
          {query ? `Tìm kiếm: "${query}"` : 'Tìm kiếm'}
        </span>
      </nav>

      <div
        className="d-flex flex-wrap align-items-center gap-2 p-3 mb-3 bg-white rounded-3 border"
        style={{ borderColor: '#f1f5f9' }}
      >
        <span className="fw-semibold me-2">
          {results.length} kết quả
          {query ? ` cho "${query}"` : ''}
        </span>

        <div className="ms-auto d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 160 }}
            value={priceFilter}
            onChange={(event) =>
              setPriceFilter(event.target.value)
            }
          >
            <option value="all">Mọi mức giá</option>
            <option value="under-100k">Dưới 100.000₫</option>
            <option value="100k-500k">100K - 500K</option>
            <option value="above-500k">Trên 500.000₫</option>
          </select>

          <select
            className="form-select form-select-sm"
            style={{ width: 170 }}
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
          >
            <option value="relevant">Liên quan</option>
            <option value="best-seller">Bán chạy</option>
            <option value="price-asc">
              Giá thấp → cao
            </option>
            <option value="price-desc">
              Giá cao → thấp
            </option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Đang tìm kiếm...
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-danger py-5 bg-white rounded-3 border">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="text-center py-5 bg-white rounded-3 border">
          <i
            className="bi bi-search"
            style={{ fontSize: 42, color: '#ddd' }}
          />
          <p className="text-muted mt-3 mb-0">
            Không tìm thấy sản phẩm nào
            {query ? ` khớp với "${query}"` : ''}
          </p>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="row g-3">
          {results.map((product) => {
            const image =
              product.images?.find((item) => item.isPrimary)
                ?.imageUrl ??
              product.images?.[0]?.imageUrl ??
              '';

            return (
              <div
                key={product.id}
                className="col-6 col-md-4 col-lg-3"
              >
                <Link
                  to={`/san-pham/${product.id}`}
                  className="d-block h-100 text-decoration-none bg-white rounded-3 border overflow-hidden sr-card"
                  style={{ borderColor: '#f1f1f1' }}
                >
                  <div
                    style={{ aspectRatio: '1', background: '#fafafa' }}
                    className="overflow-hidden"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="w-100 h-100 object-fit-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-100 d-grid place-items-center text-muted small">
                        Chưa có ảnh
                      </div>
                    )}
                  </div>

                  <div className="p-2">
                    <div
                      className="text-dark mb-1"
                      style={{
                        fontSize: 13.5,
                        minHeight: 38,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {product.name}
                    </div>

                    <div className="d-flex justify-content-between align-items-baseline">
                      <span
                        className="fw-semibold"
                        style={{ color: '#ee4d2d' }}
                      >
                        {formatCurrency(product.price)}
                      </span>

                      <small className="text-muted">
                        {formatSold(product.soldQuantity)} đã bán
                      </small>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .sr-breadcrumb {
          display: flex; align-items: center; gap: 8px;
          font-size: 13.5px; color: #888; margin-bottom: 16px;
        }
        .sr-breadcrumb a { color: #888; text-decoration: none; }
        .sr-breadcrumb a:hover { color: #ee4d2d; }
        .sr-breadcrumb .current { color: #ee4d2d; font-weight: 600; }
        .sr-card { transition: transform .15s ease, box-shadow .15s ease; }
        .sr-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(238, 77, 45, .12);
        }
        .place-items-center { place-items: center; display: grid; }
      `}</style>
    </div>
  );
}

export default SearchPage;
