import { valueLabel, recommendationText, formatDateTime } from '../common/format';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../common/api';

const RISK_COLORS = {
  LOW: { bg: '#d1fae5', color: '#059669', label: 'Thấp' },
  MEDIUM: { bg: '#fef3c7', color: '#b45309', label: 'Trung bình' },
  HIGH: { bg: '#fee2e2', color: '#dc2626', label: 'Cao' },
  CRITICAL: { bg: '#fecaca', color: '#991b1b', label: 'Nghiêm trọng' },
};

const DECISION_OPTIONS = [
  { value: 'REQUIRE_PREPAYMENT', label: 'Yêu cầu thanh toán trước', icon: 'bi-credit-card' },
  { value: 'CONTACTED_BUYER', label: 'Đã liên hệ khách hàng', icon: 'bi-telephone' },
  { value: 'CANCELLED', label: 'Hủy đơn', icon: 'bi-x-circle' },
  { value: 'BLOCKED_BUYER', label: 'Chặn khách hàng', icon: 'bi-slash-circle' },
  { value: 'IGNORED', label: 'Bỏ qua', icon: 'bi-eye-slash' },
];

/**
 * Seller Risk Portal — AI recommendations + risk theo đơn.
 * Seller chỉ thao tác với recommendation liên quan đến shop mình
 * (backend kiểm tra ownership qua order.shop_id).
 */
function SellerRiskPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  function load() {
    return api.getRecommendations().then((data) => { setError(null); setItems(Array.isArray(data) ? data : []); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDecision(recommendationId, decision) {
    try {
      setProcessingId(String(recommendationId));
      await api.createRecommendationAction(
        recommendationId,
        decision,
        noteDrafts[String(recommendationId)] || undefined,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ghi nhận quyết định thất bại');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div>
      <h1 className="h5 fw-bold mb-1">
        <i className="bi bi-shield-check me-2" style={{ color: 'var(--admin-accent)' }} />
        Đánh giá rủi ro
      </h1>
      <p className="text-muted small mb-3">
        Cảnh báo từ hệ thống trí tuệ nhân tạo cho các đơn hàng thuộc cửa hàng của bạn — quyết định cách xử lý từng trường hợp.
      </p>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {loading ? (
        <div className="text-center text-muted py-5">Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-3 border">
          <i className="bi bi-shield-check" style={{ fontSize: 48, color: '#ddd' }} />
          <p className="text-muted mt-3 mb-0">Không có cảnh báo nào</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {items.map((item) => {
            const prediction = item.prediction;
            const riskLevel = prediction?.riskLevel ?? prediction?.risk_level ?? 'LOW';
            const colors = RISK_COLORS[riskLevel] ?? RISK_COLORS.LOW;
            const latestAction =
              item.latestAction ?? (item.actions && item.actions.length > 0 ? item.actions[0] : null);

            return (
              <div key={String(item.id)} className="bg-white rounded-3 border p-3" style={{ borderColor: '#e5e7eb' }}>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span
                    className="badge rounded-pill"
                    style={{ background: colors.bg, color: colors.color }}
                  >
                    {colors.label}
                  </span>
                  <strong className="small">{recommendationText(item.title)}</strong>
                  <small className="text-muted ms-auto">{formatDateTime(item.createdAt)}</small>
                </div>

                <p className="small text-muted mb-2">{recommendationText(item.description)}</p>

                {prediction && (
                  <div className="small mb-2">
                    <i className="bi bi-person me-1 text-muted" />
                    Khách hàng:{' '}
                    <strong>{prediction.buyer?.full_name ?? prediction.buyer?.email ?? "Chưa có thông tin"}</strong>
                    {' · '}
                    Điểm đánh giá: <strong>{Number(prediction.riskScore ?? 0).toFixed(1)}</strong>
                    {prediction.orderId && (
                      <>
                        {' · '}
                        <Link to={`/nguoi-ban/don-hang/${prediction.orderId}`} style={{ color: 'var(--admin-accent)' }}>
                          Xem đơn #{prediction.orderId}
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {latestAction ? (
                  <div className="alert alert-success py-2 small mb-2">
                    Đã xử lý: <strong>{valueLabel(latestAction.decision)}</strong>
                    {latestAction.note ? ` — ${latestAction.note}` : ''}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      placeholder="Ghi chú (tùy chọn)"
                      value={noteDrafts[String(item.id)] ?? ''}
                      onChange={(event) =>
                        setNoteDrafts((prev) => ({ ...prev, [String(item.id)]: event.target.value }))
                      }
                    />
                    <div className="d-flex flex-wrap gap-2">
                      {DECISION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={processingId === String(item.id)}
                          onClick={() => handleDecision(item.id, option.value)}
                        >
                          <i className={`bi ${option.icon} me-1`} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SellerRiskPage;
