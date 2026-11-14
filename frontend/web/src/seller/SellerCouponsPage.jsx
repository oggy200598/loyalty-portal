import { valueLabel, formatCurrency, formatDate } from '../common/format';
import { useEffect, useState } from 'react';
import { api } from '../common/api';

/**
 * Mã giảm giá của shop — dữ liệu thật từ bảng coupons (GET /coupons).
 * Backend chỉ trả coupon ACTIVE/INACTIVE đang hiệu lực; seller xem danh sách
 * mã áp dụng cho sản phẩm shop mình.
 */
function SellerCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .getCoupons()
      .then((data) => {
        if (active) setCoupons(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không thể tải mã giảm giá');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function describe(coupon) {
    if (coupon.discountType === 'FREE_SHIP') {
      return 'Miễn phí vận chuyển';
    }

    if (coupon.discountType === 'PERCENT') {
      return `Giảm ${coupon.discountValue}%`;
    }

    return `Giảm ${formatCurrency(coupon.discountValue)}`;
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="mb-0">
          Mã giảm giá
        </h1>

        <span className="small text-muted ms-auto">
          {coupons.length} mã
        </span>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {loading ? (
        <div className="text-center text-muted py-5">Đang tải...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Chưa có mã giảm giá nào
        </div>
      ) : (
        <div className="row g-3">
          {coupons.map((coupon) => (
            <div key={String(coupon.id)} className="col-12 col-lg-6">
              <div
                className={`d-flex align-items-stretch bg-white rounded-3 border overflow-hidden h-100 ${
                  coupon.status !== 'ACTIVE' ? 'opacity-50' : ''
                }`}
                style={{ borderColor: '#e5e7eb', minHeight: 100 }}
              >
                <div
                  className="d-flex flex-column align-items-center justify-content-center text-white px-3"
                  style={{
                    minWidth: 120,
                    background:
                      coupon.discountType === 'FREE_SHIP'
                        ? '#02b2fa'
                        : 'var(--admin-accent)',
                  }}
                >
                  <strong style={{ fontSize: 13.5 }}>
                    {describe(coupon)}
                  </strong>

                  <small>{coupon.code}</small>
                </div>

                <div className="flex-grow-1 p-3 d-flex flex-column justify-content-center">
                  <div className="fw-semibold small text-dark">
                    {coupon.name}
                  </div>

                  <small className="text-muted">
                    Đơn tối thiểu{' '}
                    {formatCurrency(coupon.minOrderValue)}
                    {coupon.maxDiscount
                      ? ` · Tối đa ${formatCurrency(coupon.maxDiscount)}`
                      : ''}
                  </small>

                  <small className="text-muted">
                    Đã dùng: {coupon.usedCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''} lần
                    {coupon.endAt ? ` · HSD: ${formatDate(coupon.endAt)}` : ''}
                  </small>
                </div>

                <div className="d-flex flex-column justify-content-center pe-3">
                  {coupon.status === 'ACTIVE' ? (
                    <span className="badge text-bg-success">Đang hoạt động</span>
                  ) : (
                    <span className="badge text-bg-secondary">{valueLabel(coupon.status)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SellerCouponsPage;
