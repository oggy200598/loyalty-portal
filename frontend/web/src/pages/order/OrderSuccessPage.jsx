import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/format';

function OrderSuccessPage() {
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
        const data = await api.getOrderById(id);
        if (!active) return;
        setOrder(data);

        // Risk assessment lưu tạm sau khi đặt hàng
        const cached = sessionStorage.getItem(`risk_${id}`);
        if (cached) {
          try {
            setRisk(JSON.parse(cached));
          } catch {
            /* bỏ qua */
          }
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
    return (
      <div className="container py-5 text-center text-muted">Đang tải...</div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-question-circle" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">{error ?? 'Không tìm thấy đơn hàng'}</h1>
        <Link to="/" className="btn mt-3 text-white" style={{ background: '#ee4d2d' }}>
          Về trang chủ
        </Link>
      </div>
    );
  }

  const riskLevel = risk?.risk_level;
  const isRisky = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <div className="text-center mb-4">
        <div
          className="mx-auto d-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{
            width: 84,
            height: 84,
            background: '#e8f7ee',
            color: '#28a745',
            fontSize: 40,
          }}
        >
          <i className="bi bi-check-lg" />
        </div>

        <h1 className="h4 fw-bold">Đặt hàng thành công!</h1>
        <p className="text-muted mb-0">
          Mã đơn hàng:{' '}
          <span className="fw-semibold text-dark">{order.order_code}</span>
        </p>
      </div>

      {/* Risk assessment */}
      {risk && (
        <div
          className="rounded-3 border p-3 mb-3 small"
          style={{
            borderColor: isRisky ? '#f5c2c7' : '#d1e7dd',
            background: isRisky ? '#fff5f5' : '#f0faf4',
          }}
        >
          <div className="fw-semibold mb-1">
            <i className={`bi ${isRisky ? 'bi-shield-exclamation' : 'bi-shield-check'} me-1`} />
            Đánh giá rủi ro: {risk.risk_level} ({Number(risk.risk_score).toFixed(1)}/100)
          </div>
          {isRisky && (
            <div style={{ color: '#b02a37' }}>
              Đơn hàng của bạn đã được đánh dấu kiểm tra bởi hệ thống chống rủi ro.
              Shop có thể yêu cầu thanh toán trước để xác nhận.
            </div>
          )}
        </div>
      )}

      <div
        className="bg-white rounded-3 border p-3 mb-3"
        style={{ borderColor: '#f1f1f1' }}
      >
        <div className="row g-2 small">
          <div className="col-6">
            <span className="text-muted">Người nhận:</span>{' '}
            <span className="fw-semibold">{order.shipping_receiver_name}</span>
          </div>

          <div className="col-6">
            <span className="text-muted">Điện thoại:</span>{' '}
            <span className="fw-semibold">{order.shipping_phone}</span>
          </div>

          <div className="col-12">
            <span className="text-muted">Địa chỉ:</span>{' '}
            <span className="fw-semibold">{order.shipping_address_detail}</span>
          </div>

          <div className="col-6">
            <span className="text-muted">Thanh toán:</span>{' '}
            <span className="fw-semibold">
              {order.payments?.[0]?.method ?? '—'}
            </span>
          </div>

          <div className="col-6 text-md-end">
            <span className="text-muted">Ngày đặt:</span>{' '}
            {formatDateTime(order.created_at)}
          </div>
        </div>
      </div>

      <div
        className="bg-white rounded-3 border p-3 mb-3"
        style={{ borderColor: '#f1f1f1' }}
      >
        {(order.order_items ?? []).map((item) => (
          <div key={String(item.id)} className="d-flex align-items-center gap-3 py-2 border-bottom">
            <div
              className="rounded d-flex align-items-center justify-content-center"
              style={{ width: 52, height: 52, background: '#fafafa', fontSize: 20 }}
            >
              🛍️
            </div>

            <div className="flex-grow-1 min-w-0">
              <div className="small text-dark text-truncate">{item.product_name}</div>
            </div>

            <small className="text-muted">x{item.quantity}</small>

            <span
              className="fw-semibold small"
              style={{ color: '#ee4d2d', minWidth: 100, textAlign: 'right' }}
            >
              {formatCurrency(Number(item.subtotal))}
            </span>
          </div>
        ))}

        <div className="pt-3 small ms-auto" style={{ maxWidth: 320 }}>
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Tạm tính</span>
            <span>{formatCurrency(Number(order.subtotal))}</span>
          </div>

          {Number(order.discount_amount) > 0 && (
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Giảm giá</span>
              <span className="text-success">
                -{formatCurrency(Number(order.discount_amount))}
              </span>
            </div>
          )}

          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Phí vận chuyển</span>
            <span>
              {Number(order.shipping_fee) === 0
                ? 'Miễn phí'
                : formatCurrency(Number(order.shipping_fee))}
            </span>
          </div>

          <hr />

          <div className="d-flex justify-content-between">
            <span className="fw-semibold">Tổng tiền</span>
            <span className="fw-bold fs-5" style={{ color: '#ee4d2d' }}>
              {formatCurrency(Number(order.total_amount))}
            </span>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 justify-content-center">
        <Link
          to={`/orders/${order.id}`}
          className="btn px-4 fw-semibold"
          style={{ border: '1.5px solid #ee4d2d', color: '#ee4d2d' }}
        >
          Xem đơn hàng
        </Link>

        <Link
          to="/products"
          className="btn text-white px-4 fw-semibold"
          style={{ background: '#ee4d2d' }}
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
}

export default OrderSuccessPage;
