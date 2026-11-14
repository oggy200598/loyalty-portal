import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../common/api';
import { formatCurrency } from '../common/format';

function FlashSalePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getFlashSaleProducts(12);

        if (!active) return;
        setProducts(data);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải Giờ vàng giảm giá',
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
      <div
        className="p-4 mb-3 rounded-3 text-white d-flex flex-wrap align-items-center gap-3"
        style={{
          background:
            'linear-gradient(120deg, #ee4d2d, #ff7337)',
        }}
      >
        <h1 className="h3 fw-bold mb-0">
          <i className="bi bi-lightning-charge-fill me-2" />
          GIỜ VÀNG GIẢM GIÁ
        </h1>

        <span className="opacity-75">Giá niêm yết và phiếu ưu đãi hiện có</span>
      </div>

      {loading && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Đang tải sản phẩm giảm giá...
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-danger py-5 bg-white rounded-3 border">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Chưa có sản phẩm giờ vàng giảm giá
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="row g-3">
          {products.map((product) => {
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
                  className="d-block h-100 text-decoration-none bg-white rounded-3 border overflow-hidden fs-card"
                  style={{ borderColor: '#f1f1f1' }}
                >
                  <div
                    className="position-relative overflow-hidden"
                    style={{ aspectRatio: '1', background: '#fafafa' }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="w-100 h-100 object-fit-cover"
                        loading="lazy"
                      />
                    ) : null}

                    <span
                      className="position-absolute top-0 end-0 px-2 py-1 fw-bold"
                      style={{
                        background: '#ffd424',
                        color: '#ee4d2d',
                        fontSize: 12,
                        borderBottomLeftRadius: 8,
                      }}
                    >
                      {product.coupons?.length ? 'Có phiếu ưu đãi' : 'Đang bán'}
                    </span>
                  </div>

                  <div className="p-2">
                    <div
                      className="text-dark mb-2"
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

                    <div className="d-flex align-items-baseline gap-2 mb-2">
                      <span
                        className="fw-bold"
                        style={{ color: '#ee4d2d' }}
                      >
                        {formatCurrency(product.salePrice)}
                      </span>
                    </div>

                    {/* Tiến trình đã bán */}
                    <div
                      className="progress"
                      style={{ height: 18 }}
                    >
                      <div
                        className={`progress-bar ${
                          product.outOfStock
                            ? 'bg-secondary'
                            : ''
                        }`}
                        role="progressbar"
                        style={{
                          width: `${product.progressPercent}%`,
                          background: product.outOfStock
                            ? undefined
                            : '#ee4d2d',
                        }}
                      />
                    </div>

                    <small
                      className={
                        product.outOfStock
                          ? 'text-danger'
                          : 'text-warning fw-semibold'
                      }
                    >
                      {product.outOfStock
                        ? 'Hết hàng'
                        : `Đã bán ${product.soldInSale} · Còn ${product.totalStock}`}
                    </small>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .fs-card { transition: transform .15s ease, box-shadow .15s ease; }
        .fs-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(238, 77, 45, .15);
        }
      `}</style>
    </div>
  );
}

export default FlashSalePage;
