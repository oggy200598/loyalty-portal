import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../common/api';
import {
  formatCurrency,
  getCouponLabel,
  formatSold,
  categoryPath,
  categoryForPath,
} from '../common/format';

function CategoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setCategory(null);
        setProducts([]);
        const categoriesData = await api.getCategories();
        if (!active) return;
        const found = categoryForPath(Array.isArray(categoriesData) ? categoriesData : [], id);
        if (!found) throw new Error('Không tìm thấy danh mục.');
        const productsData = await api.getProductsByCategory(String(found.id));
        if (!active) return;
        setCategory(found ?? null);
        setProducts(
          Array.isArray(productsData)
            ? productsData
            : [],
        );
        const canonical = categoryPath(found);
        if (location.pathname !== canonical) {
          navigate({ pathname: canonical, search: location.search, hash: location.hash }, { replace: true, state: location.state });
        }
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh mục',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id, location.pathname, location.search, location.hash, location.state, navigate]);

  return (
    <>
      <style>{`
        .cat-page {
          width: min(1200px, calc(100% - 32px));
          margin: 20px auto 48px;
        }

        .cat-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #888;
          margin-bottom: 16px;
        }

        .cat-breadcrumb a {
          color: #888;
          text-decoration: none;
        }

        .cat-breadcrumb a:hover {
          color: #ee4d2d;
        }

        .cat-breadcrumb .current {
          color: #ee4d2d;
          font-weight: 600;
        }

        .cat-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 10px rgba(15, 23, 42, .04);
          margin-bottom: 18px;
        }

        .cat-header-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff3ef;
          color: #ee4d2d;
          font-size: 24px;
        }

        .cat-header h1 {
          font-size: 20px;
          font-weight: 700;
          color: #222;
          margin: 0;
        }

        .cat-header p {
          font-size: 13.5px;
          color: #999;
          margin: 2px 0 0;
        }

        .cat-state {
          padding: 60px 16px;
          text-align: center;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          color: #888;
          font-size: 14.5px;
        }

        .cat-state.error {
          color: #d93025;
        }

        .cat-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(190px, 1fr)
          );
          gap: 14px;
        }

        .cat-card {
          display: block;
          background: #fff;
          border: 1px solid #f1f1f1;
          border-radius: 10px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .cat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(238, 77, 45, .12);
        }

        .cat-card-image-wrap {
          position: relative;
          aspect-ratio: 1;
          background: #fafafa;
          overflow: hidden;
        }

        .cat-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .25s ease;
        }

        .cat-card:hover .cat-card-image {
          transform: scale(1.05);
        }

        .cat-card-placeholder {
          height: 100%;
          display: grid;
          place-items: center;
          color: #ccc;
          font-size: 13px;
        }

        .cat-discount-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 2px 7px;
          border-radius: 6px;
          background: rgba(255, 212, 36, .95);
          color: #ee4d2d;
          font-size: 11.5px;
          font-weight: 700;
        }

        .cat-card-content {
          padding: 10px 12px 12px;
        }

        .cat-card-name {
          font-size: 13.5px;
          line-height: 1.4;
          color: #333;
          margin: 0 0 8px;
          min-height: 38px;

          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .cat-coupon-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }

        .cat-coupon {
          padding: 1px 6px;
          border: 1px solid #ee4d2d;
          border-radius: 4px;
          color: #ee4d2d;
          background: #fff5f2;
          font-size: 10.5px;
          font-weight: 600;
          white-space: nowrap;
        }

        .cat-coupon.ship {
          border-color: #02b2fa;
          color: #02b2fa;
          background: #f0fbff;
        }

        .cat-card-bottom {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .cat-card-price {
          color: #ee4d2d;
          font-size: 15.5px;
          font-weight: 600;
        }

        .cat-card-sold {
          color: #aaa;
          font-size: 11.5px;
          white-space: nowrap;
        }
      `}</style>

      <div className="cat-page">
        <nav className="cat-breadcrumb">
          <Link to="/">
            <i className="bi bi-house-door" /> Trang chủ
          </Link>
          <i className="bi bi-chevron-right" />
          <span className="current">
            {category?.name ?? 'Danh mục'}
          </span>
        </nav>

        {category && (
          <div className="cat-header">
            <div className="cat-header-icon">
              <i className="bi bi-grid" />
            </div>

            <div>
              <h1>{category.name}</h1>
              <p>
                {products.length} sản phẩm
                {category.productCount != null &&
                  products.length !==
                    category.productCount
                  ? ''
                  : ''}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="cat-state">
            Đang tải sản phẩm...
          </div>
        )}

        {!loading && error && (
          <div className="cat-state error">{error}</div>
        )}

        {!loading &&
        !error &&
        products.length === 0 ? (
          <div className="cat-state">
            Danh mục chưa có sản phẩm
          </div>
        ) : null}

        {!loading && !error && products.length > 0 && (
          <div className="cat-grid">
            {products.map((product) => {
              const image =
                product.images?.find(
                  (item) => item.isPrimary,
                )?.imageUrl ??
                product.images?.[0]?.imageUrl ??
                '';

              const sold = Number(
                product.soldQuantity ?? 0,
              );

              const coupons = (
                product.coupons ?? []
              ).slice(0, 2);

              const discount =
                product.discountPercent ?? null;

              return (
                <Link
                  key={product.id}
                  to={`/san-pham/${product.id}`}
                  className="cat-card"
                >
                  <div className="cat-card-image-wrap">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="cat-card-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="cat-card-placeholder">
                        Chưa có ảnh
                      </div>
                    )}

                    {discount !== null && (
                      <div className="cat-discount-badge">
                        -{discount}%
                      </div>
                    )}
                  </div>

                  <div className="cat-card-content">
                    <h3
                      className="cat-card-name"
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    {coupons.length > 0 && (
                      <div className="cat-coupon-row">
                        {coupons.map((coupon) => (
                          <span
                            key={coupon.id}
                            className={`cat-coupon ${
                              coupon.discountType ===
                              'FREE_SHIP'
                                ? 'ship'
                                : ''
                            }`}
                          >
                            {getCouponLabel(coupon)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="cat-card-bottom">
                      <span className="cat-card-price">
                        {formatCurrency(product.price)}
                      </span>

                      <span className="cat-card-sold">
                        {formatSold(sold)} đã bán
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default CategoryPage;
