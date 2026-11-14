import { useEffect, useState } from 'react';
import { api } from '../common/api';
import {
  formatCurrency,
  formatDate,
} from '../common/format';

function CouponCard({ coupon, saved, onSave }) {
  const isFreeship =
    coupon.discountType === 'FREE_SHIP';

  const discountText = isFreeship
    ? 'Miễn phí vận chuyển'
    : coupon.discountType === 'PERCENT'
      ? `Giảm ${coupon.discountValue}%`
      : `Giảm ${formatCurrency(coupon.discountValue)}`;

  const conditionText = `Đơn tối thiểu ${formatCurrency(
    coupon.minOrderValue,
  )}${
    coupon.maxDiscount
      ? ` · Giảm tối đa ${formatCurrency(coupon.maxDiscount)}`
      : ''
  }`;

  return (
    <div
      className="d-flex align-items-stretch bg-white rounded-3 border overflow-hidden cp-card"
      style={{ borderColor: '#f1f1f1', minHeight: 110 }}
    >
      {/* Phần giá trị */}
      <div
        className="d-flex flex-column align-items-center justify-content-center text-white px-3"
        style={{
          minWidth: 130,
          background: isFreeship ? '#02b2fa' : '#ee4d2d',
        }}
      >
        <i
          className={`bi ${
            isFreeship
              ? 'bi-truck'
              : 'bi-ticket-perforated'
          }`}
          style={{ fontSize: 22 }}
        />

        <strong className="mt-1 text-center" style={{ fontSize: 14 }}>
          {discountText}
        </strong>
      </div>

      {/* Phần thông tin */}
      <div className="flex-grow-1 p-3 d-flex flex-column justify-content-center">
        <div className="fw-semibold text-dark">
          {coupon.name}
        </div>

        <small className="text-muted">
          Mã: <span className="fw-semibold">{coupon.code ?? 'AUTO'}</span>
        </small>

        <small className="text-muted">{conditionText}</small>

        {coupon.endDate && (
          <small className="text-muted">
            HSD: {formatDate(coupon.endDate)}
          </small>
        )}
      </div>

      {/* Nút lưu */}
      <div className="d-flex align-items-center pe-3">
        <button
          type="button"
          className={`btn btn-sm px-3 fw-semibold ${
            saved ? 'btn-outline-secondary' : 'text-white'
          }`}
          style={
            saved ? undefined : { background: '#ee4d2d' }
          }
          onClick={onSave}
          disabled={saved}
        >
          {saved ? 'Đã lưu' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}

function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Lấy coupon từ sản phẩm (backend gắn coupon theo product/category)
        const products = await api.getProducts(36);

        if (!active) return;

        const map = new Map();

        (Array.isArray(products) ? products : []).forEach(
          (product) => {
            (product.coupons ?? []).forEach((coupon) => {
              if (!map.has(coupon.id)) {
                map.set(coupon.id, coupon);
              }
            });
          },
        );

        setCoupons([...map.values()]);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải phiếu ưu đãi',
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

  function handleSave(id) {
    setSavedIds((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
  }

  const freeshipCoupons = coupons.filter(
    (coupon) => coupon.discountType === 'FREE_SHIP',
  );

  const discountCoupons = coupons.filter(
    (coupon) => coupon.discountType !== 'FREE_SHIP',
  );

  return (
    <div className="container py-4">
      <div
        className="p-4 mb-3 rounded-3 text-white"
        style={{
          background:
            'linear-gradient(120deg, #ee4d2d, #ff7337)',
        }}
      >
        <h1 className="h4 fw-bold mb-0">
          <i className="bi bi-ticket-perforated-fill me-2" />
          Kho mã giảm giá
        </h1>
      </div>

      {loading && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Đang tải phiếu ưu đãi...
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-danger py-5 bg-white rounded-3 border">
          {error}
        </div>
      )}

      {!loading && !error && coupons.length === 0 && (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Chưa có phiếu ưu đãi nào
        </div>
      )}

      {!loading && !error && coupons.length > 0 && (
        <>
          {discountCoupons.length > 0 && (
            <>
              <h2 className="h6 fw-bold mb-2">
                Phiếu ưu đãi giảm giá
              </h2>

              <div className="row g-3 mb-4">
                {discountCoupons.map((coupon) => (
                  <div key={coupon.id} className="col-12 col-lg-6">
                    <CouponCard
                      coupon={coupon}
                      saved={savedIds.includes(coupon.id)}
                      onSave={() => handleSave(coupon.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {freeshipCoupons.length > 0 && (
            <>
              <h2 className="h6 fw-bold mb-2">
                Ưu đãi miễn phí vận chuyển
              </h2>

              <div className="row g-3">
                {freeshipCoupons.map((coupon) => (
                  <div key={coupon.id} className="col-12 col-lg-6">
                    <CouponCard
                      coupon={coupon}
                      saved={savedIds.includes(coupon.id)}
                      onSave={() => handleSave(coupon.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        .cp-card { transition: box-shadow .15s ease; }
        .cp-card:hover { box-shadow: 0 6px 20px rgba(238, 77, 45, .12); }
      `}</style>
    </div>
  );
}

export default CouponsPage;
