import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/format';

const RISK_COLORS = {
  LOW: { bg: '#d1fae5', color: '#059669' },
  MEDIUM: { bg: '#fef3c7', color: '#b45309' },
  HIGH: { bg: '#fee2e2', color: '#dc2626' },
  CRITICAL: { bg: '#fecaca', color: '#991b1b' },
};

const ACTION_LABELS = {
  REQUIRE_PREPAYMENT: 'Yêu cầu thanh toán trước',
  FLAG_FOR_REVIEW: 'Đánh dấu kiểm tra',
  LIMIT_COD: 'Hạn chế COD',
  BLOCK_BUYER: 'Chặn buyer',
  SEND_WARNING: 'Gửi cảnh báo',
  NO_ACTION: 'Không hành động',
};

const DECISION_OPTIONS = [
  { value: 'REQUIRE_PREPAYMENT', label: 'Yêu cầu thanh toán trước', icon: 'bi-credit-card' },
  { value: 'CONTACTED_BUYER', label: 'Đã liên hệ buyer', icon: 'bi-telephone' },
  { value: 'CANCELLED', label: 'Hủy đơn', icon: 'bi-x-circle' },
  { value: 'BLOCKED_BUYER', label: 'Chặn buyer', icon: 'bi-slash-circle' },
  { value: 'IGNORED', label: 'Bỏ qua', icon: 'bi-eye-slash' },
];

function SellerRiskActionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRecommendations();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải recommendations');
    } finally {
      setLoading(false);
    }
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
      setError(
        err instanceof Error ? err.message : 'Ghi nhận quyết định thất bại',
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="container py-4">
      <h1 className="h5 fw-bold mb-1">
        <i className="bi bi-shield-check me-2" style={{ color: '#ee4d2d' }} />
        Xử lý rủi ro
      </h1>
      <p className="text-muted small mb-3">
        Các cảnh báo từ hệ thống AI — quyết định cách xử lý từng trường hợp.
      </p>

      {error && (
        <div className="alert alert-danger py-2 small">{error}</div>
      )}

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
            const riskLevel = prediction?.riskLevel ?? 'LOW';
            const colors = RISK_COLORS[riskLevel] ?? RISK_COLORS.LOW;
            const latestDecision =
              item.actions && item.actions.length > 0
                ? item.actions[0]
                : null;
            const busy = processingId === String(item.id);

            return (
              <div
                key={String(item.id)}
                className="bg-white rounded-3 border p-3"
                style={{ borderColor: '#f1f1f1' }}
              >
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span
                    className="badge rounded-pill"
                    style={{ background: colors.bg, color: colors.color }}
                  >
                    {riskLevel} · {Number(prediction?.riskScore ?? 0).toFixed(0)}/100
                  </span>

                  <span className="small fw-semibold">{item.title}</span>

                  <small className="text-muted ms-auto">
                    {formatDateTime(item.createdAt)}
                  </small>
                </div>

                {item.description && (
                  <p className="small text-muted mb-2">{item.description}</p>
                )}

                {/* Buyer info */}
                {prediction?.buyer && (
                  <div className="small mb-2">
                    <i className="bi bi-person me-1 text-muted" />
                    <span className="fw-semibold">
                      {prediction.buyer.full_name ?? prediction.buyer.email}
                    </span>
                    <span className="text-muted">
                      {' '}· Hành động đề xuất:{' '}
                      {ACTION_LABELS[item.actionType] ?? item.actionType}
                    </span>
                  </div>
                )}

                {/* Đã xử lý */}
                {latestDecision ? (
                  <div
                    className="small p-2 rounded"
                    style={{ background: '#f0faf4', color: '#16a34a' }}
                  >
                    <i className="bi bi-check-circle me-1" />
                    Đã xử lý:{' '}
                    <span className="fw-semibold">
                      {DECISION_OPTIONS.find(
                        (opt) => opt.value === latestDecision.decision,
                      )?.label ?? latestDecision.decision}
                    </span>
                    {latestDecision.note && ` — ${latestDecision.note}`}
                    <span className="text-muted ms-1">
                      ({formatDateTime(latestDecision.createdAt)})
                    </span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-2"
                      placeholder="Ghi chú (tùy chọn)"
                      value={noteDrafts[String(item.id)] ?? ''}
                      onChange={(event) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [String(item.id)]: event.target.value,
                        }))
                      }
                    />

                    <div className="d-flex flex-wrap gap-2">
                      {DECISION_OPTIONS.filter(
                        (opt) => opt.value !== 'IGNORED' || true,
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`btn btn-sm ${
                            opt.value === 'IGNORED'
                              ? 'btn-outline-secondary'
                              : 'text-white'
                          }`}
                          style={
                            opt.value === 'IGNORED'
                              ? {}
                              : { background: '#ee4d2d' }
                          }
                          disabled={busy}
                          onClick={() => handleDecision(item.id, opt.value)}
                        >
                          <i className={`bi ${opt.icon} me-1`} />
                          {busy ? '...' : opt.label}
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

export default SellerRiskActionsPage;
