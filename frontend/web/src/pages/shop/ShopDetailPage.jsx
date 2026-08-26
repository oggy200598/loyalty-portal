import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import {
  formatCurrency,
  formatSold,
  normalizeText,
} from '../../utils/format';

function ShopDetailPage() {
  const { id } = useParams();

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('relevant');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [shopData, productsData] =
          await Promise.all([
            api.getShopById(id),
            api.getProductsByShop(id),
          ]);

        if (!active) return;

        setShop(shopData ?? null);
        setProducts(
          Array.isArray(productsData)
            ? productsData
            : [],
        );
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin shop',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const visibleProducts = useMemo(() => {
    let list = products;

    if (keyword.trim()) {
      const normalized = normalizeText(keyword);
      list = list.filter((product) =>
        normalizeText(product.name).includes(normalized),
      );
    }

    if (sort === 'price-asc') {
      list = [...list].sort(
        (a, b) =>
          Number(a.price ?? 0) - Number(b.price ?? 0),
      );
    } else if (sort === 'price-desc') {
      list = [...list].sort(
        (a, b) =>
          Number(b.price ?? 0) - Number(a.price ?? 0),
      );
    } else if (sort === 'best-seller') {
      list = [...list].sort(
        (a, b) =>
          Number(b.soldQuantity ?? 0) -
          Number(a.soldQuantity ?? 0),
      );
    } else if (sort === 'newest') {
      list = [...list];
    }

    return list;
  }, [products, keyword, sort]);

  return (
    <div className="container py-4">
      <nav className="sd-breadcrumb">
        <Link to="/">
          <i className="bi bi-house-door" /> Trang chủ
        </Link>
        <i className="bi bi-chevron-right" />
        <Link to="/shops">Tất cả shop</Link>
        <i className="bi bi-chevron-right" />
        <span className="current">
          {shop?.name ?? 'Shop'}
        </span>
      </nav>

      {loading && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Đang tải shop...
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-danger py-5 bg-white rounded-3 border">
          {error}
        </div>
      )}

      {!loading && !error && shop && (
        <>
          {/* Shop header */}
          <div
            className="rounded-3 text-white p-4 mb-3"
            style={{
              background:
                'linear-gradient(120deg, #ee4d2d, #ff7337)',
            }}
          >
            <div className="d-flex align-items-center gap-3 flex-wrap">
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt=""
                  className="rounded-circle border border-white border-2"
                  style={{
                    width: 84,
                    height: 84,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle fw-bold border border-white border-2"
                  style={{
                    width: 84,
                    height: 84,
                    background: 'rgba(255,255,255,.2)',
                    fontSize: 34,
                  }}
                >
                  {(shop.name ?? 'S')
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div>
                <h1 className="h4 fw-bold mb-1">
                  {shop.name}
                </h1>

                <small className="d-block opacity-75 mb-2">
                  {shop.description ??
                    'Chưa có mô tả'}
                </small>

                <div className="d-flex gap-3 small">
                  <span>
                    <i className="bi bi-box-seam me-1" />
                    {shop.productCount} sản phẩm
                  </span>

                  <span>
                    <i className="bi bi-receipt me-1" />
                    {shop.orderCount} đơn hàng
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bộ lọc trong shop */}
          <div
            className="d-flex flex-wrap align-items-center gap-2 p-3 mb-3 bg-white rounded-3 border"
            style={{ borderColor: '#f1f1f1' }}
          >
            <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
              <span className="input-group-text bg-white">
                <i className="bi bi-search" />
              </span>

              <input
                type="text"
                className="form-control"
                placeholder="Tìm trong shop..."
                value={keyword}
                onChange={(event) =>
                  setKeyword(event.target.value)
                }
              />
            </div>

            <select
              className="form-select form-select-sm ms-auto"
              style={{ width: 180 }}
              value={sort}
              onChange={(event) =>
                setSort(event.target.value)
              }
            >
              <option value="relevant">Liên quan</option>
              <option value="newest">Mới nhất</option>
              <option value="best-seller">Bán chạy</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
            </select>
          </div>

          {/* Sản phẩm */}
          {visibleProducts.length === 0 ? (
            <div className="text-center text-muted py-5 bg-white rounded-3 border">
              Shop chưa có sản phẩm phù hợp
            </div>
          ) : (
            <div className="row g-3">
              {visibleProducts.map((product) => {
                const image =
                  product.images?.find(
                    (item) => item.isPrimary,
                  )?.imageUrl ??
                  product.images?.[0]?.imageUrl ??
                  '';

                return (
                  <div
                    key={product.id}
                    className="col-6 col-md-4 col-lg-3"
                  >
                    <Link
                      to={`/products/${product.id}`}
                      className="d-block h-100 text-decoration-none bg-white rounded-3 border overflow-hidden sd-card"
                      style={{ borderColor: '#f1f1f1' }}
                    >
                      <div
                        className="overflow-hidden"
                        style={{
                          aspectRatio: '1',
                          background: '#fafafa',
                        }}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={product.name}
                            className="w-100 h-100 object-fit-cover"
                            loading="lazy"
                          />
                        ) : null}
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
                            {formatSold(
                              product.soldQuantity,
                            )}{' '}
                            đã bán
                          </small>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <style>{`
        .sd-breadcrumb {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          font-size: 13.5px; color: #888; margin-bottom: 16px;
        }
        .sd-breadcrumb a { color: #888; text-decoration: none; }
        .sd-breadcrumb a:hover { color: #ee4d2d; }
        .sd-breadcrumb .current { color: #ee4d2d; font-weight: 600; }
        .sd-card { transition: transform .15s ease, box-shadow .15s ease; }
        .sd-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(238, 77, 45, .12);
        }
      `}</style>
    </div>
  );
}

export default ShopDetailPage;
