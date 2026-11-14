import { useEffect, useState } from 'react';
import { api } from '../common/api';

const LEVEL_META = {
  LOW: { bg: '#d1fae5', color: '#059669', label: 'Thấp' },
  MEDIUM: { bg: '#fef3c7', color: '#b45309', label: 'Trung bình' },
  HIGH: { bg: '#fee2e2', color: '#dc2626', label: 'Cao' },
  CRITICAL: { bg: '#fecaca', color: '#991b1b', label: 'Nghiêm trọng' },
};

/** Admin Risk — thống kê risk toàn hệ thống. */
export default function AdminRiskPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .getRiskOverview()
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="text-center text-muted py-5">Đang tải...</div>;
  if (error) return <div className="alert alert-danger py-2 small">{error}</div>;

  const levels = overview?.levels ?? {};

  return (
    <div>
      <h1 className="h5 fw-bold mb-3">Thống kê rủi ro</h1>

      <div className="row g-3 mb-4">
        {Object.entries(LEVEL_META).map(([key, meta]) => (
          <div key={key} className="col-6 col-md-3">
            <div
              className="rounded-3 border p-3"
              style={{ background: meta.bg, borderColor: '#e5e7eb' }}
            >
              <div className="fw-bold" style={{ color: meta.color, fontSize: 22 }}>
                {levels[key] ?? 0}
              </div>
              <small style={{ color: meta.color }}>{meta.label}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3 border p-3" style={{ borderColor: '#e5e7eb' }}>
        <h2 className="h6 fw-bold mb-2">Tổng quan</h2>
        <p className="small text-muted mb-0">
          Tổng số lượt chấm điểm: <strong>{overview?.totalScoredBuyers ?? 0}</strong>
        </p>
      </div>
    </div>
  );
}
