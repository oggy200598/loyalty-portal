import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../common/api';
import { useAuth } from '../accounts/authContext';
import { formatCurrency, formatDateTime, valueLabel } from '../common/format';

const STATUS_META = {
  ALL: '#666',
  PENDING: '#f59e0b',
  CONFIRMED: '#f59e0b',
  PROCESSING: '#3b82f6',
  SHIPPING: '#8b5cf6',
  DELIVERED: '#16a34a',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
  RETURNED: '#dc2626',
  FAILED: '#dc2626',
  NON_RECEIVED: '#dc2626',
};

function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (!isAuthenticated) return;

        const status = tab === 'ALL' ? undefined : tab;
        const data = await api.getOrders(page, 10, status);

        if (!active) return;
        setOrders(data?.data ?? []);
        setPagination(data?.pagination ?? null);
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
  }, [tab, page, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-lock" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">Vui lòng đăng nhập để xem đơn hàng</h1>
        <Link
          to="/dang-nhap"
          className="btn text-white px-4"
          style={{ background: '#ee4d2d' }}
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="h5 fw-bold mb-3">Đơn hàng của tôi</h1>

      {/* Tabs */}
      <ul className="nav nav-pills gap-2 mb-3 flex-nowrap overflow-auto">
        {Object.keys(STATUS_META).map((key) => (
          <li key={key} className="nav-item">
            <button
              type="button"
              className={`nav-link py-1 px-3 small text-nowrap ${
                tab === key ? 'text-white' : 'text-dark'
              }`}
              style={
                tab === key ? { background: '#ee4d2d' } : { background: '#fff' }
              }
              onClick={() => {
                setPage(1);
                setTab(key);
              }}
            >
              {key === 'ALL' ? 'Tất cả' : valueLabel(key)}
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="text-center py-5 text-muted">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-5 text-danger">{error}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-3 border">
          <i className="bi bi-receipt" style={{ fontSize: 48, color: '#ddd' }} />
          <p className="text-muted mt-3 mb-0">Chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {orders.map((order) => {
            const meta = STATUS_META[order.status] ?? STATUS_META.ALL;
            const items = order.order_items ?? [];

            return (
              <div
                key={String(order.id)}
                className="bg-white rounded-3 border p-3"
                style={{ borderColor: '#f1f1f1' }}
              >
                <div className="d-flex flex-wrap align-items-center gap-2 pb-2 border-bottom">
                  <span className="fw-semibold small">{order.order_code}</span>

                  <span
                    className="badge rounded-pill"
                    style={{ background: `${meta}1a`, color: meta }}
                  >
                    {valueLabel(order.status)}
                  </span>

                  <small className="text-muted ms-auto">
                    {formatDateTime(order.created_at)}
                  </small>
                </div>

                <div className="py-2">
                  {items.slice(0, 2).map((item) => (
                    <div
                      key={String(item.id)}
                      className="d-flex align-items-center gap-2 py-1 small"
                    >
                      <div
                        className="rounded d-flex align-items-center justify-content-center"
                        style={{
                          width: 40,
                          height: 40,
                          background: '#fafafa',
                          fontSize: 16,
                        }}
                      >
                        🛍️
                      </div>

                      <span className="text-truncate flex-grow-1">
                        {item.product_name}
                      </span>

                      <span className="text-muted">x{item.quantity}</span>
                    </div>
                  ))}

                  {items.length > 2 && (
                    <small className="text-muted">
                      và {items.length - 2} sản phẩm khác...
                    </small>
                  )}
                </div>

                <div className="d-flex align-items-center pt-2 border-top">
                  <span className="small">
                    Tổng:{' '}
                    <span className="fw-bold" style={{ color: '#ee4d2d' }}>
                      {formatCurrency(Number(order.total_amount))}
                    </span>
                  </span>

                  <Link
                    to={`/don-hang/${order.id}`}
                    className="btn btn-sm ms-auto text-white px-3"
                    style={{ background: '#ee4d2d' }}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <nav className="d-flex justify-content-center gap-2 mt-4">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Trước
          </button>

          <span className="btn btn-sm btn-light disabled">
            Trang {pagination.page}/{pagination.totalPages}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau →
          </button>
        </nav>
      )}
    </div>
  );
}

export default OrdersPage;
