import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../common/api';
import { formatCurrency, formatDateTime } from '../common/format';

const STATUS_META = {
  PENDING: { label: 'Chờ xử lý', color: '#6b7280' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#f59e0b' },
  PROCESSING: { label: 'Đang xử lý', color: '#8b5cf6' },
  SHIPPING: { label: 'Đang giao', color: '#06b6d4' },
  DELIVERED: { label: 'Đã giao', color: '#10b981' },
  COMPLETED: { label: 'Hoàn thành', color: '#16a34a' },
  CANCELLED: { label: 'Đã hủy', color: '#dc2626' },
};

const NEXT_ACTION = {
  CONFIRMED: { next: 'PROCESSING', label: 'Xử lý' },
  PROCESSING: { next: 'SHIPPING', label: 'Giao hàng' },
  SHIPPING: { next: 'DELIVERED', label: 'Đã giao' },
  DELIVERED: { next: 'COMPLETED', label: 'Hoàn thành' },
};

function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  function load() {
    return api.getOrders(page, 20, tab === 'ALL' ? undefined : tab).then((data) => { setError(null); setOrders(data?.data ?? []); setPagination(data?.pagination ?? null); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  async function updateStatus(orderId, newStatus) {
    try {
      setUpdatingId(orderId);
      await api.updateOrderStatus(orderId, newStatus);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-heading"><div><h1>Quản lý đơn hàng</h1><p>Theo dõi và xử lý đơn hàng của cửa hàng.</p></div></div>

      {error && (
        <div className="alert alert-danger py-2 small">{error}</div>
      )}

      {/* Tabs */}
      <ul className="nav admin-tabs gap-2 mb-3 flex-nowrap overflow-auto">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link py-1 px-3 small text-nowrap ${
              tab === 'ALL' ? 'active' : ''
            }`}
            onClick={() => {
              setPage(1);
              setTab('ALL');
            }}
          >
            Tất cả
          </button>
        </li>

        {Object.entries(STATUS_META).map(([key, meta]) => (
          <li key={key} className="nav-item">
            <button
              type="button"
              className={`nav-link py-1 px-3 small text-nowrap ${
                tab === key ? 'active' : ''
              }`}
              onClick={() => {
                setPage(1);
                setTab(key);
              }}
            >
              {meta.label}
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="text-center text-muted py-5">Đang tải...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Không có đơn hàng nào
        </div>
      ) : (
        <div
          className="admin-table-surface"
        >
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0 small">
              <thead>
                <tr className="text-muted">
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Ngày</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const meta = STATUS_META[order.status] ?? STATUS_META.PENDING;
                  const action = NEXT_ACTION[order.status];
                  const busy = updatingId === String(order.id);

                  return (
                    <tr key={String(order.id)}>
                      <td className="fw-semibold">
                        <Link
                          to={`/nguoi-ban/don-hang/${order.id}`}
                          className="text-decoration-none"
                          style={{ color: 'var(--admin-accent)' }}
                        >
                          {order.order_code}
                        </Link>
                      </td>

                      <td>{order.shipping_receiver_name}</td>

                      <td>{formatDateTime(order.created_at)}</td>

                      <td>{formatCurrency(Number(order.total_amount))}</td>

                      <td>
                        <span
                          className="badge rounded-pill"
                          style={{
                            background: `${meta.color}1a`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>

                      <td className="text-end">
                        {action && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary me-1"
                            disabled={busy}
                            onClick={() =>
                              updateStatus(order.id, action.next)
                            }
                          >
                            {busy ? '...' : action.label}
                          </button>
                        )}

                        {order.status !== 'CANCELLED' &&
                          order.status !== 'COMPLETED' &&
                          order.status !== 'DELIVERED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={busy}
                              onClick={() => updateStatus(order.id, 'CANCELLED')}
                            >
                              Hủy
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <nav className="d-flex justify-content-center gap-2 mt-3">
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
      )}
    </div>
  );
}

export default SellerOrdersPage;
