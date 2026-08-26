import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';

function useCountdown(targetHour) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const target = new Date(now);
      target.setHours(targetHour, 0, 0, 0);

      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target - now;
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);

      setRemaining(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetHour]);

  return remaining;
}

function FlashSalePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Countdown đến cuối giờ hiện tại
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const target = new Date(now);
      target.setHours(now.getHours() + 1, 0, 0, 0);

      const diff = target - now;
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);

      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

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
            : 'Không thể tải Flash Sale',
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
          FLASH SALE
        </h1>

        <span className="opacity-75">Kết thúc sau</span>

        <span
          className="px-3 py-1 rounded fw-bold"
          style={{
            background: 'rgba(0,0,0,.25)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {countdown}
        </span>
      </div>

      {/* Khung giờ */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          className="btn btn-sm text-white fw-semibold"
          style={{ background: '#ee4d2d' }}
        >
          {windows.current.startHour}:00 -{' '}
          {windows.current.endHour % 24}:00 · Đang diễn ra
        </button>

        {windows.upcoming.map((window) => (
          <button
            key={window.id}
            className="btn btn-sm btn-outline-secondary"
            disabled
          >
            {window.startHour}:00 -{' '}
            {window.endHour}:00 · Sắp diễn ra
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Đang tải sản phẩm sale...
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-danger py-5 bg-white rounded-3 border">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Chưa có sản phẩm flash sale
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
                  to={`/products/${product.id}`}
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
                      -{product.discountPercent}%
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

                      <small className="text-muted text-decoration-line-through">
                        {formatCurrency(product.originalPrice)}
                      </small>
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
                        : `Đã bán ${product.soldInSale}/${product.totalStock}`}
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
