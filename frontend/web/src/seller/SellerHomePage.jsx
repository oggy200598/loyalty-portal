import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../common/api';
import { formatCurrency } from '../common/format';
import { OrderCharts } from '../common/DashboardCharts';

export default function SellerHomePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api.getSellerStats()
      .then(data => { if (active) setStats(data); })
      .catch(err => { if (active) setError(err.message || 'Không thể tải tổng quan bán hàng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const metrics = [
    { label: 'Giá trị đơn đã giao', value: formatCurrency(stats?.revenue ?? 0), to: '/nguoi-ban/phan-tich', note: 'Đơn đã giao và hoàn tất' },
    { label: 'Đơn hàng', value: (stats?.orders ?? 0).toLocaleString('vi-VN'), to: '/nguoi-ban/don-hang', note: 'Tất cả đơn của cửa hàng' },
    { label: 'Sản phẩm', value: stats?.products ?? 0, to: '/nguoi-ban/san-pham', note: 'Theo dõi danh mục và tồn kho' },
    { label: 'Chờ xử lý', value: stats?.pendingOrders ?? 0, to: '/nguoi-ban/don-hang', note: 'Đơn hàng cần kiểm tra' },
  ];
  const operations = [
    { to: '/nguoi-ban/don-hang', icon: 'bi-receipt', title: 'Xử lý đơn hàng', note: 'Theo dõi giao hàng và cập nhật trạng thái', count: stats?.pendingOrders ?? 0 },
    { to: '/nguoi-ban/san-pham', icon: 'bi-box-seam', title: 'Sản phẩm và tồn kho', note: 'Kiểm tra sản phẩm đang bán', count: stats?.products ?? 0 },
    { to: '/nguoi-ban/ma-giam-gia', icon: 'bi-ticket-perforated', title: 'Mã giảm giá', note: 'Xem các ưu đãi áp dụng cho cửa hàng' },
  ];

  return <div>
    <div className="admin-page-heading">
      <div><h1>Tổng quan bán hàng</h1><p>Theo dõi hoạt động và những việc cần xử lý của cửa hàng.</p></div>
      <Link to="/nguoi-ban/don-hang" className="btn btn-primary">Xem đơn hàng</Link>
    </div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {loading ? <p className="admin-loading" role="status">Đang tải tổng quan...</p> : !error && <>
      <div className="admin-metrics">
        {metrics.map(item => <Link className="admin-metric" key={item.label} to={item.to}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></Link>)}
      </div>
      <OrderCharts charts={stats?.charts} />
      <div className="admin-overview-columns">
        <section className="admin-surface">
          <div className="admin-section-heading"><h2>Hoạt động cửa hàng</h2><span>{stats?.shopCount ?? 0} cửa hàng</span></div>
          {operations.map(item => <Link className="admin-operation" key={item.to} to={item.to}>
            <i className={`bi ${item.icon}`} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.note}</small></span>
            {item.count != null && <b>{item.count}</b>}<i className="bi bi-chevron-right" aria-hidden="true" />
          </Link>)}
        </section>
        <div className="admin-overview-side">
          <section className="admin-surface">
            <div className="admin-section-heading"><h2>Rủi ro đơn hàng</h2><span>Cần theo dõi</span></div>
            <div className="admin-risk-summary"><span className="admin-status-dot" /><span><strong>{stats?.highRiskOrders ?? 0} đơn rủi ro cao</strong><small>Kiểm tra thông tin trước khi xử lý đơn.</small></span></div>
            <Link to="/nguoi-ban/rui-ro" className="admin-text-link">Xem cảnh báo<i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          </section>
          <section className="admin-surface">
            <div className="admin-section-heading"><h2>Báo cáo bán hàng</h2></div>
            <div className="admin-compact-row"><span>Doanh thu</span><Link to="/nguoi-ban/phan-tich">{formatCurrency(stats?.revenue ?? 0)}</Link></div>
            <Link to="/nguoi-ban/phan-tich" className="admin-text-link">Xem phân tích<i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          </section>
        </div>
      </div>
    </>}
  </div>;
}
