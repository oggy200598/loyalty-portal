import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/format';

const TIMELINE = [
  { key: 'PLACED', label: 'Đặt hàng', icon: 'bi-cart-check' },
  { key: 'CONFIRMED', label: 'Xác nhận', icon: 'bi-patch-check' },
  { key: 'PROCESSING', label: 'Đang xử lý', icon: 'bi-box-seam' },
  { key: 'SHIPPING', label: 'Đang giao', icon: 'bi-truck' },
  { key: 'DELIVERED', label: 'Đã giao', icon: 'bi-house-check' },
  { key: 'COMPLETED', label: 'Hoàn thành', icon: 'bi-star' },
];

const STATUS_TO_STEP = {
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPING: 3,
  DELIVERED: 4,
  COMPLETED: 5,
};

const CANCELLED_STATUSES = ['CANCELLED', 'RETURNED', 'FAILED'];

function OrderDetailPage() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const data = await api.getOrderById(id);
        if (active) setOrder(data);
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
        <i className="bi bi-receipt" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">{error ?? 'Không tìm thấy đơn hàng'}</h1>
        <Link to="/orders" className="btn mt-3 text-white" style={{ background: '#ee4d2d' }}>
          Xem đơn hàng của tôi
        </Link>
      </div>
    );
  }

  const isCancelled = CANCELLED_STATUSES.includes(order.status);
  const currentStep = STATUS_TO_STEP[order.status] ?? 1;
  const history = order.order_status_history ?? [];

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <nav className="od-breadcrumb">
        <Link to="/orders">Đơn hàng của tôi</Link>
        <i className="bi bi-chevron-right" />
        <span className="current">{order.order_code}</span>
      </nav>

      {/* Timeline */}
      {!isCancelled ? (
        <div
          className="bg-white rounded-3 border p-4 mb-3"
          style={{ borderColor: '#f1f1f1' }}
        >
          <div className="d-flex justify-content-between position-relative">
            <div
              className="position-absolute od-line"
              style={{
                top: 18,
                left: '8%',
                right: '8%',
                height: 3,
                background: '#eee',
              }}
            />

            <div
              className="position-absolute"
              style={{
                top: 18,
                left: '8%',
                width: `${(currentStep / (TIMELINE.length - 1)) * 84}%`,
                height: 3,
                background: '#ee4d2d',
                transition: 'width .4s ease',
              }}
            />

            {TIMELINE.map((step, index) => {
              const done = index <= currentStep;

              return (
                <div
                  key={step.key}
                  className="text-center position-relative d-flex flex-column align-items-center"
                  style={{ minWidth: 70 }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 38,
                      height: 38,
                      background: done ? '#ee4d2d' : '#eee',
                      color: done ? '#fff' : '#aaa',
                      fontSize: 15,
                      zIndex: 1,
                    }}
                  >
                    <i className={`bi ${step.icon}`} />
                  </div>

                  <small
                    className={`mt-1 ${done ? 'fw-semibold text-dark' : 'text-muted'}`}
                    style={{ fontSize: 11.5 }}
                  >
                    {step.label}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="rounded-3 border p-3 mb-3 small fw-semibold text-center"
          style={{ borderColor: '#f5c2c7', background: '#fff5f5', color: '#b02a37' }}
        >
          Đơn hàng đã bị {order.status === 'CANCELLED' ? 'hủy' : order.status === 'RETURNED' ? 'hoàn trả' : 'thất bại'}
        </div>
      )}

      {/* Lịch sử trạng thái */}
      {history.length > 0 && (
        <div
          className="bg-white rounded-3 border p-3 mb-3"
          style={{ borderColor: '#f1f1f1' }}
        >
          <h2 className="h6 fw-bold mb-2">
            <i className="bi bi-clock-history me-1" style={{ color: '#ee4d2d' }} />
            Lịch sử trạng thái
          </h2>

          <ul className="list-unstyled mb-0 small">
            {history.map((entry) => (
              <li key={String(entry.id)} className="d-flex gap-2 py-1 border-bottom">
                <span className="text-muted" style={{ minWidth: 150 }}>
                  {formatDateTime(entry.created_at)}
                </span>
                <span>
                  {entry.old_status ? `${entry.old_status} → ` : ''}
                  <span className="fw-semibold">{entry.new_status}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Thông tin giao hàng */}
      <div
        className="bg-white rounded-3 border p-3 mb-3"
        style={{ borderColor: '#f1f1f1' }}
      >
        <h2 className="h6 fw-bold mb-2">
          <i className="bi bi-geo-alt me-1" style={{ color: '#ee4d2d' }} />
          Thông tin nhận hàng
        </h2>

        <div className="row g-1 small">
          <div className="col-md-6">
            <span className="text-muted">Người nhận:</span>{' '}
            <span className="fw-semibold">{order.shipping_receiver_name}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted">Điện thoại:</span>{' '}
            <span className="fw-semibold">{order.shipping_phone}</span>
          </div>

          <div className="col-12">
            <span className="text-muted">Địa chỉ:</span>{' '}
            <span className="fw-semibold">{order.shipping_address_detail}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted">Thanh toán:</span>{' '}
            <span className="fw-semibold">
              {order.payments?.[0]?.method ?? '—'} ({order.payments?.[0]?.status ?? ''})
            </span>
          </div>

          <div className="col-md-6">
            <span className="text-muted">Ngày đặt:</span>{' '}
            {formatDateTime(order.created_at)}
          </div>
        </div>
      </div>

      {/* Sản phẩm + tổng kết */}
      <div
        className="bg-white rounded-3 border p-3 mb-3"
        style={{ borderColor: '#f1f1f1' }}
      >
        <h2 className="h6 fw-bold mb-2">Sản phẩm</h2>

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

            <small className="text-muted">
              {formatCurrency(Number(item.unit_price))} x{item.quantity}
            </small>

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

      {/* Actions */}
      <div className="d-flex flex-wrap gap-2 justify-content-end">
        {currentStep <= 2 && !isCancelled && (
          <button type="button" className="btn btn-outline-danger btn-sm px-3">
            Hủy đơn
          </button>
        )}

        <button type="button" className="btn btn-outline-secondary btn-sm px-3">
          Liên hệ shop
        </button>

        <button
          type="button"
          className="btn btn-sm px-3 text-white"
          style={{ background: '#ee4d2d' }}
        >
          Mua lại
        </button>
      </div>

      <style>{`
        .od-breadcrumb {
          display: flex; align-items: center; gap: 8px;
          font-size: 13.5px; color: #888; margin-bottom: 16px;
        }
        .od-breadcrumb a { color: #888; text-decoration: none; }
        .od-breadcrumb a:hover { color: #ee4d2d; }
        .od-breadcrumb .current { color: #ee4d2d; font-weight: 600; }
      `}</style>
    </div>
  );
}

export default OrderDetailPage;
