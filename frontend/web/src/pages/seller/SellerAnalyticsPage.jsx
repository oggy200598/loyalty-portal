import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/format';

/** Seller Analytics — KPI từ dữ liệu thật của shop seller. */
function SellerAnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .getSellerStats()
      .then((data) => {
        if (active) setStats(data);
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

  const completionRate =
    stats && stats.orders > 0
      ? Math.round(((stats.orders - stats.pendingOrders) / stats.orders) * 100)
      : 0;

  const rows = [
    { label: 'Tổng doanh thu', value: formatCurrency(stats?.revenue ?? 0), icon: 'bi-currency-dollar' },
    { label: 'Tổng đơn hàng', value: (stats?.orders ?? 0).toLocaleString('vi-VN'), icon: 'bi-receipt' },
    { label: 'Đơn chờ xử lý', value: stats?.pendingOrders ?? 0, icon: 'bi-hourglass-split' },
    { label: 'Tỷ lệ hoàn tất', value: `${completionRate}%`, icon: 'bi-check-circle' },
    { label: 'Số sản phẩm', value: stats?.products ?? 0, icon: 'bi-box-seam' },
    { label: 'Đơn rủi ro cao', value: stats?.highRiskOrders ?? 0, icon: 'bi-shield-exclamation' },
  ];

  return (
    <div>
      <h1 className="h5 fw-bold mb-3">Phân tích bán hàng</h1>
      <div className="row g-3">
        {rows.map((row) => (
          <div key={row.label} className="col-6 col-md-4 col-xl-2">
            <div className="bg-white rounded-3 border p-3 h-100" style={{ borderColor: '#e5e7eb' }}>
              <i className={`bi ${row.icon}`} style={{ color: '#ee4d2d', fontSize: 20 }} />
              <div className="fw-bold mt-1" style={{ fontSize: 17 }}>{row.value}</div>
              <small className="text-muted">{row.label}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SellerAnalyticsPage;
