import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/format';

const RISK_COLORS = {
  LOW: { bg: '#d1fae5', color: '#059669', label: 'Thấp' },
  MEDIUM: { bg: '#fef3c7', color: '#b45309', label: 'Trung bình' },
  HIGH: { bg: '#fee2e2', color: '#dc2626', label: 'Cao' },
  CRITICAL: { bg: '#fecaca', color: '#991b1b', label: 'Nghiêm trọng' },
};

/**
 * Seller Order Detail + Risk Assessment theo ORDER.
 * Backend: GET /orders/:id (ownership check) + GET /risk/orders/:orderId
 * (seller chỉ được xem risk của order thuộc shop mình — 403 nếu không).
 */
function SellerOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const orderData = await api.getOrderById(id);
        if (!active) return;
        setOrder(orderData);

        try {
          const riskData = await api.getRiskForOrder(id);
          if (active) setRisk(riskData?.prediction ?? null);
        } catch {
          // Chưa có risk prediction cho đơn này hoặc không có quyền — hiển thị trống
          if (active) setRisk(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không thể tải đơn hàng');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <div className="text-center text-muted py-5">Đang tải...</div>;
  }

  if (error || !order) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-receipt" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">{error ?? 'Không tìm thấy đơn hàng'}</h1>
        <Link to="/seller/orders" className="btn mt-3 text-white" style={{ background: '#ee4d2d' }}>
          Về danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const riskLevel = risk?.risk_level ?? risk?.riskLevel;
  const colors = RISK_COLORS[riskLevel] ?? null;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link to="/seller/orders" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1" />
          Đơn hàng
        </Link>
        <h1 className="h5 fw-bold mb-0">Đơn #{order.order_code}</h1>
      </div>

      <div className="row g-3">
        {/* Thông tin đơn */}
        <div className="col-lg-7">
          <div className="bg-white rounded-3 border p-3 mb-3" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="h6 fw-bold mb-3">Thông tin đơn hàng</h2>
            <dl className="row small mb-0">
              <dt className="col-5 text-muted">Khách hàng</dt>
              <dd className="col-7">{order.shipping_receiver_name}</dd>
              <dt className="col-5 text-muted">Số điện thoại</dt>
              <dd className="col-7">{order.shipping_phone}</dd>
              <dt className="col-5 text-muted">Địa chỉ</dt>
              <dd className="col-7">{order.shipping_address_detail}</dd>
              <dt className="col-5 text-muted">Ngày đặt</dt>
              <dd className="col-7">{formatDateTime(order.created_at)}</dd>
              <dt className="col-5 text-muted">Trạng thái</dt>
              <dd className="col-7">{order.status}</dd>
              <dt className="col-5 text-muted">Tổng tiền</dt>
              <dd className="col-7 fw-bold">{formatCurrency(Number(order.total_amount))}</dd>
            </dl>
          </div>

          <div className="bg-white rounded-3 border p-3" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="h6 fw-bold mb-3">Sản phẩm</h2>
            {(order.order_items ?? []).map((item) => (
              <div key={String(item.id)} className="d-flex justify-content-between small border-bottom py-2">
                <span>
                  {item.product_name} × {item.quantity}
                </span>
                <span className="fw-semibold">{formatCurrency(Number(item.subtotal))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="col-lg-5">
          <div className="bg-white rounded-3 border p-3" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="h6 fw-bold mb-3">
              <i className="bi bi-shield-exclamation me-1" style={{ color: '#dc2626' }} />
              Risk Assessment
            </h2>

            {!risk ? (
              <p className="text-muted small mb-0">
                Chưa có đánh giá rủi ro cho đơn hàng này.
              </p>
            ) : (
              <>
                <div
                  className="rounded-3 p-3 mb-3 d-flex align-items-center justify-content-between"
                  style={{ background: colors?.bg ?? '#f3f4f6' }}
                >
                  <div>
                    <small className="text-muted d-block">Mức độ rủi ro</small>
                    <strong style={{ color: colors?.color }}>
                      {colors?.label ?? riskLevel}
                    </strong>
                  </div>
                  <div className="text-end">
                    <small className="text-muted d-block">Risk Score</small>
                    <strong>{Number(risk.risk_score ?? risk.riskScore ?? 0).toFixed(1)}</strong>
                  </div>
                </div>

                {(risk.risk_explanations ?? []).length > 0 && (
                  <>
                    <small className="text-muted d-block mb-2">Yếu tố ảnh hưởng</small>
                    {(risk.risk_explanations ?? []).map((exp) => (
                      <div key={String(exp.id)} className="d-flex justify-content-between small border-bottom py-1">
                        <span>{exp.feature_name}</span>
                        <span className={Number(exp.impact_value) > 0 ? 'text-danger' : 'text-success'}>
                          {Number(exp.impact_value) > 0 ? '+' : ''}
                          {Number(exp.impact_value ?? 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerOrderDetailPage;
