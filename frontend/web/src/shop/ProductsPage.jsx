import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../common/api';
import {
  formatCurrency,
  formatSold,
  normalizeText,
} from '../common/format';

function getCouponLabel(coupon) {
  if (coupon.discountType === 'FREE_SHIP') {
    return 'Miễn phí vận chuyển';
  }

  if (coupon.discountType === 'PERCENT') {
    return `Giảm ${coupon.discountValue}%`;
  }

  if (coupon.discountType === 'FIXED') {
    return `Giảm ${formatCurrency(coupon.discountValue)}`;
  }

  return 'Ưu đãi';
}

function ProductsPage() {
  const [searchParams] = useSearchParams();
  const search = (
    searchParams.get('search') ?? ''
  ).trim();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getProducts(120);

        if (!active) return;

        setProducts(
          Array.isArray(data) ? data : [],
        );
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải sản phẩm',
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
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search) return products;

    const normalized = normalizeText(search);

    return products.filter((product) =>
      normalizeText(product.name).includes(
        normalized,
      ),
    );
  }, [products, search]);

  return (
    <>
      <style>{`
        .pl-page {
          width: min(1200px, calc(100% - 32px));
          margin: 20px auto 48px;
        }

        .pl-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #888;
          margin-bottom: 16px;
        }

        .pl-breadcrumb a {
          color: #888;
          text-decoration: none;
        }

        .pl-breadcrumb a:hover {
          color: #ee4d2d;
        }

        .pl-breadcrumb .current {
          color: #ee4d2d;
          font-weight: 600;
        }

        .pl-header {
          padding: 18px 22px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 10px rgba(15, 23, 42, .04);
          margin-bottom: 18px;
        }

        .pl-header h1 {
          font-size: 20px;
          font-weight: 700;
          color: #222;
          margin: 0;
        }

        .pl-header p {
          font-size: 13.5px;
          color: #999;
          margin: 2px 0 0;
        }

        .pl-state {
          padding: 60px 16px;
          text-align: center;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          color: #888;
          font-size: 14.5px;
        }

        .pl-state.error {
          color: #d93025;
        }

        .pl-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(190px, 1fr)
          );
          gap: 14px;
        }

        .pl-card {
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

        .pl-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(238, 77, 45, .12);
        }

        .pl-card-image-wrap {
          position: relative;
          aspect-ratio: 1;
          background: #fafafa;
          overflow: hidden;
        }

        .pl-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .25s ease;
        }

        .pl-card:hover .pl-card-image {
          transform: scale(1.05);
        }

        .pl-card-placeholder {
          height: 100%;
          display: grid;
          place-items: center;
          color: #ccc;
          font-size: 13px;
        }

        .pl-discount-badge {
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

        .pl-card-content {
          padding: 10px 12px 12px;
        }

        .pl-card-name {
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

        .pl-coupon-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }

        .pl-coupon {
          padding: 1px 6px;
          border: 1px solid #ee4d2d;
          border-radius: 4px;
          color: #ee4d2d;
          background: #fff5f2;
          font-size: 10.5px;
          font-weight: 600;
          white-space: nowrap;
        }

        .pl-coupon.ship {
          border-color: #02b2fa;
          color: #02b2fa;
          background: #f0fbff;
        }

        .pl-card-bottom {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .pl-card-price {
          color: #ee4d2d;
          font-size: 15.5px;
          font-weight: 600;
        }

        .pl-card-sold {
          color: #aaa;
          font-size: 11.5px;
          white-space: nowrap;
        }
      `}</style>

      <div className="pl-page">
        <nav className="pl-breadcrumb">
          <Link to="/">
            <i className="bi bi-house-door" /> Trang chủ
          </Link>
          <i className="bi bi-chevron-right" />
          <span className="current">
            Tất cả sản phẩm
          </span>
        </nav>

        <div className="pl-header">
          <h1>
            {search
              ? `Kết quả cho "${search}"`
              : 'Tất cả sản phẩm'}
          </h1>
          <p>{filteredProducts.length} sản phẩm</p>
        </div>

        {loading && (
          <div className="pl-state">
            Đang tải sản phẩm...
          </div>
        )}

        {!loading && error && (
          <div className="pl-state error">{error}</div>
        )}

        {!loading &&
        !error &&
        filteredProducts.length === 0 ? (
          <div className="pl-state">
            {search
              ? `Không tìm thấy sản phẩm nào khớp với "${search}"`
              : 'Chưa có sản phẩm'}
          </div>
        ) : null}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="pl-grid">
            {filteredProducts.map((product) => {
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
                  className="pl-card"
                >
                  <div className="pl-card-image-wrap">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="pl-card-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="pl-card-placeholder">
                        Chưa có ảnh
                      </div>
                    )}

                    {discount !== null && (
                      <div className="pl-discount-badge">
                        -{discount}%
                      </div>
                    )}
                  </div>

                  <div className="pl-card-content">
                    <h3
                      className="pl-card-name"
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    {coupons.length > 0 && (
                      <div className="pl-coupon-row">
                        {coupons.map((coupon) => (
                          <span
                            key={coupon.id}
                            className={`pl-coupon ${
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

                    <div className="pl-card-bottom">
                      <span className="pl-card-price">
                        {formatCurrency(product.price)}
                      </span>

                      <span className="pl-card-sold">
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

export default ProductsPage;
