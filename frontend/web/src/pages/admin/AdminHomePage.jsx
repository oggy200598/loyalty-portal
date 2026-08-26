import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/format';

/** Admin Dashboard — tổng quan toàn hệ thống (GET /admin/overview, ADMIN only). */
export default function AdminHomePage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .getAdminOverview()
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

  const KPIS = [
    { label: 'Tổng user', value: overview?.totalUsers ?? 0, icon: 'bi-people', color: '#3b82f6' },
    { label: 'Buyer', value: overview?.totalBuyers ?? 0, icon: 'bi-person', color: '#0ea5e9' },
    { label: 'Seller', value: overview?.totalSellers ?? 0, icon: 'bi-person-badge', color: '#f59e0b' },
    { label: 'Shops', value: overview?.totalShops ?? 0, icon: 'bi-shop', color: '#8b5cf6' },
    { label: 'Products', value: overview?.totalProducts ?? 0, icon: 'bi-box-seam', color: '#14b8a6' },
    { label: 'Orders', value: overview?.totalOrders ?? 0, icon: 'bi-receipt', color: '#6366f1' },
    { label: 'Revenue', value: formatCurrency(overview?.totalRevenue ?? 0), icon: 'bi-currency-dollar', color: '#16a34a' },
    { label: 'Coupons', value: overview?.activeCoupons ?? 0, icon: 'bi-ticket-perforated', color: '#ec4899' },
    { label: 'Risk cao/CT', value: overview?.highRiskPredictions ?? 0, icon: 'bi-shield-exclamation', color: '#dc2626' },
    { label: 'ML Models', value: overview?.activeModels ?? 0, icon: 'bi-cpu', color: '#64748b' },
    { label: 'Audit Logs', value: overview?.auditLogCount ?? 0, icon: 'bi-journal-text', color: '#475569' },
  ];

  return (
    <div>
      <h1 className="h5 fw-bold mb-3">Admin Dashboard</h1>
      <div className="row g-3">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="col-6 col-md-4 col-xl-2">
            <div className="bg-white rounded-3 border p-3 h-100" style={{ borderColor: '#e5e7eb' }}>
              <i className={`bi ${kpi.icon}`} style={{ color: kpi.color, fontSize: 20 }} />
              <div className="fw-bold mt-1" style={{ fontSize: 16 }}>{kpi.value}</div>
              <small className="text-muted">{kpi.label}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
