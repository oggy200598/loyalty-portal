import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/format';

const MENU = [
  { to: '/seller/orders', icon: 'bi-receipt', title: 'Đơn hàng', description: 'Quản lý và cập nhật trạng thái đơn hàng của shop' },
  { to: '/seller/products', icon: 'bi-box-seam', title: 'Sản phẩm', description: 'Quản lý sản phẩm và tồn kho' },
  { to: '/seller/coupons', icon: 'bi-ticket-perforated', title: 'Mã giảm giá', description: 'Tạo và quản lý voucher cho shop' },
  { to: '/seller/analytics', icon: 'bi-graph-up', title: 'Phân tích', description: 'Doanh thu và hiệu suất bán hàng' },
  { to: '/seller/risk', icon: 'bi-shield-exclamation', title: 'Risk Assessment', description: 'Cảnh báo AI theo từng đơn hàng', highlight: true },
];

export default function SellerHomePage() {
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

  const KPIS = stats
    ? [
        { label: 'Doanh thu', value: formatCurrency(stats.revenue), icon: 'bi-currency-dollar', color: '#16a34a' },
        { label: 'Đơn hàng', value: (stats.orders ?? 0).toLocaleString('vi-VN'), icon: 'bi-receipt', color: '#3b82f6' },
        { label: 'Sản phẩm', value: stats.products ?? 0, icon: 'bi-box-seam', color: '#f59e0b' },
        { label: 'Chờ xử lý', value: stats.pendingOrders ?? 0, icon: 'bi-hourglass-split', color: '#8b5cf6' },
        { label: 'Shop', value: stats.shopCount ?? 0, icon: 'bi-shop', color: '#0ea5e9' },
        { label: 'Risk cao', value: stats.highRiskOrders ?? 0, icon: 'bi-shield-exclamation', color: (stats.highRiskOrders ?? 0) > 0 ? '#dc2626' : '#16a34a' },
      ]
    : [];

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="h5 fw-bold mb-0">Seller Dashboard</h1>
        <Link to="/seller/risk" className="btn btn-sm text-white ms-auto" style={{ background: '#ee4d2d' }}>
          Risk Assessment
        </Link>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {loading ? (
        <div className="text-center text-muted py-5">Đang tải...</div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {KPIS.map((kpi) => (
              <div key={kpi.label} className="col-6 col-md-4 col-xl-2">
                <div className="bg-white rounded-3 border p-3 h-100" style={{ borderColor: '#e5e7eb' }}>
                  <i className={`bi ${kpi.icon}`} style={{ color: kpi.color, fontSize: 20 }} />
                  <div className="fw-bold mt-1" style={{ fontSize: 17 }}>{kpi.value}</div>
                  <small className="text-muted">{kpi.label}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-3">
            {MENU.map((item) => (
              <div key={item.to} className="col-12 col-md-6 col-lg-4">
                <Link
                  to={item.to}
                  className={`d-block h-100 text-decoration-none bg-white rounded-3 border p-3 ${
                    item.highlight ? 'border-danger' : ''
                  }`}
                  style={{ borderColor: item.highlight ? '#f5c2c7' : '#e5e7eb' }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle mb-2"
                    style={{
                      width: 44,
                      height: 44,
                      background: item.highlight ? '#fff5f5' : '#fff3ef',
                      color: item.highlight ? '#b02a37' : '#ee4d2d',
                      fontSize: 20,
                    }}
                  >
                    <i className={`bi ${item.icon}`} />
                  </div>
                  <div className="fw-semibold text-dark small">
                    {item.title}
                    {item.highlight && (
                      <span className="badge ms-2" style={{ background: '#dc2626', fontSize: 10 }}>
                        AI
                      </span>
                    )}
                  </div>
                  <small className="text-muted">{item.description}</small>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
