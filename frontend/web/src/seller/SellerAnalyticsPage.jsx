import { useEffect, useState } from 'react';
import { api } from '../common/api';
import { formatCurrency } from '../common/format';
import { OrderCharts } from '../common/DashboardCharts';

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
      ? Math.round(((stats.completedOrders ?? 0) / stats.orders) * 100)
      : 0;

  const rows = [
    { label: 'Giá trị đơn đã giao', value: formatCurrency(stats?.revenue ?? 0), icon: 'bi-currency-dollar' },
    { label: 'Tổng đơn hàng', value: (stats?.orders ?? 0).toLocaleString('vi-VN'), icon: 'bi-receipt' },
    { label: 'Đơn chờ xử lý', value: stats?.pendingOrders ?? 0, icon: 'bi-hourglass-split' },
    { label: 'Tỷ lệ hoàn tất', value: `${completionRate}%`, icon: 'bi-check-circle' },
    { label: 'Số sản phẩm', value: stats?.products ?? 0, icon: 'bi-box-seam' },
    { label: 'Đơn rủi ro cao', value: stats?.highRiskOrders ?? 0, icon: 'bi-shield-exclamation' },
  ];

  return (
    <div>
      <div className="admin-page-heading"><div><h1>Phân tích bán hàng</h1><p>Số liệu tổng hợp từ đơn hàng và sản phẩm của cửa hàng.</p></div></div>
      <div className="admin-metrics seller-metrics">
        {rows.map((row) => (
          <div key={row.label} className="admin-metric">
            <span>{row.label}</span><strong>{row.value}</strong>
          </div>
        ))}
      </div>
      <OrderCharts charts={stats?.charts} />
    </div>
  );
}

export default SellerAnalyticsPage;
