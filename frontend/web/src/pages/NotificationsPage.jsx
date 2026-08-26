import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../auth/useAuth';
import { formatDateTime } from '../utils/format';

const GROUPS = {
  all: 'Tất cả',
  ORDER_UPDATE: 'Đơn hàng',
  RISK_ALERT: 'Rủi ro',
  PROMOTION: 'Khuyến mãi',
  SYSTEM: 'Hệ thống',
};

const GROUP_ICONS = {
  ORDER_UPDATE: 'bi-receipt',
  RISK_ALERT: 'bi-shield-exclamation',
  PROMOTION: 'bi-megaphone',
  SYSTEM: 'bi-gear',
};

function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await api.getNotifications(page, 20);
      setNotifications(data?.data ?? []);
      setUnreadCount(data?.unreadCount ?? 0);
      setPagination(data?.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isAuthenticated]);

  async function markRead(id) {
    setNotifications((prev) =>
      prev.map((item) =>
        String(item.id) === String(id) ? { ...item, is_read: true } : item,
      ),
    );
    try {
      await api.markNotificationRead(id);
    } catch {
      /* bỏ qua */
    }
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true })),
      );
      setUnreadCount(0);
    } catch {
      /* bỏ qua */
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-lock" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">Vui lòng đăng nhập để xem thông báo</h1>
        <a
          href="/login"
          className="btn text-white px-4 mt-3"
          style={{ background: '#ee4d2d' }}
        >
          Đăng nhập
        </a>
      </div>
    );
  }

  const filtered =
    group === 'all'
      ? notifications
      : notifications.filter(
          (item) => (item.type ?? 'SYSTEM') === group,
        );

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <h1 className="h5 fw-bold mb-0">Thông báo</h1>

        {unreadCount > 0 && (
          <span className="badge rounded-pill text-bg-danger">{unreadCount} mới</span>
        )}

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary ms-auto"
            onClick={markAllRead}
          >
            Đọc tất cả
          </button>
        )}
      </div>

      {/* Group tabs */}
      <ul className="nav nav-pills gap-2 mb-3 flex-nowrap overflow-auto">
        {Object.entries(GROUPS).map(([key, label]) => (
          <li key={key} className="nav-item">
            <button
              type="button"
              className={`nav-link py-1 px-3 small text-nowrap ${
                group === key ? 'text-white' : 'text-dark'
              }`}
              style={
                group === key ? { background: '#ee4d2d' } : { background: '#fff' }
              }
              onClick={() => {
                setPage(1);
                setGroup(key);
              }}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="text-center py-5 text-muted">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-5 text-danger">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-3 border">
          <i className="bi bi-bell" style={{ fontSize: 48, color: '#ddd' }} />
          <p className="text-muted mt-3 mb-0">Không có thông báo nào</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {filtered.map((item) => {
            const type = item.type ?? 'SYSTEM';
            const icon = GROUP_ICONS[type] ?? 'bi-bell';
            const unread = !item.is_read;

            return (
              <div
                key={String(item.id)}
                className={`bg-white rounded-3 border p-3 d-flex gap-3 ${
                  unread ? 'border-start border-3' : ''
                }`}
                style={{
                  borderColor: '#f1f1f1',
                  borderStartColor: unread ? '#ee4d2d' : undefined,
                  opacity: unread ? 1 : 0.75,
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    background: '#fff3ef',
                    color: '#ee4d2d',
                    fontSize: 17,
                  }}
                >
                  <i className={`bi ${icon}`} />
                </div>

                <div className="flex-grow-1 min-width-0">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold small text-truncate">
                      {item.title}
                    </span>

                    {unread && (
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{ width: 8, height: 8, background: '#ee4d2d' }}
                      />
                    )}
                  </div>

                  <small className="text-muted d-block">{item.message}</small>

                  <small className="text-muted">
                    {formatDateTime(item.created_at)}
                  </small>
                </div>

                {unread && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-secondary align-self-center p-0"
                    onClick={() => markRead(item.id)}
                    title="Đánh dấu đã đọc"
                  >
                    <i className="bi bi-check2-all" />
                  </button>
                )}
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

export default NotificationsPage;
