import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../common/api';
import { formatCurrency } from '../common/format';
import { OrderCharts } from '../common/DashboardCharts';

/** Admin Dashboard — tổng quan toàn hệ thống (GET /admin/overview, ADMIN only). */
export default function AdminHomePage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .getAdminOverview()
      .then((data) => {
        if (active) { setOverview(data); setUpdatedAt(new Date()); }
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
  }, [revision]);

  const heading = <div className="admin-page-heading">
    <div><h1>Tổng quan</h1><p>Tình hình kinh doanh và hoạt động cửa hàng.</p></div>
    <div className="admin-heading-actions">
      {updatedAt && <span className="admin-updated">Cập nhật {updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
      <button className="btn btn-sm btn-outline-secondary" disabled={loading} onClick={() => { setLoading(true); setError(null); setRevision((value) => value + 1); }}><i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />Làm mới</button>
    </div>
  </div>;
  if (loading) return <>{heading}<div className="admin-loading" role="status">Đang tải số liệu...</div></>;
  if (error) return <>{heading}<div className="alert alert-danger" role="alert">{error}</div></>;

  const KPIS = [
    { label: 'Giá trị đơn đã giao', value: formatCurrency(overview?.totalRevenue ?? 0), caption: 'Đã giao và hoàn tất', to: '/quan-tri/don-hang' },
    { label: 'Đơn hàng', value: overview?.totalOrders ?? 0, caption: 'Tất cả trạng thái', to: '/quan-tri/don-hang' },
    { label: 'Khách hàng', value: overview?.totalBuyers ?? 0, caption: 'Tài khoản người mua', to: '/quan-tri/tai-khoan' },
    { label: 'Sản phẩm', value: overview?.totalProducts ?? 0, caption: 'Trên toàn hệ thống', to: '/quan-tri/san-pham' },
  ];
  const operations = [
    { label: 'Đơn hàng', note: 'Theo dõi giao hàng và thanh toán', value: overview?.totalOrders ?? 0, icon: 'bi-receipt', to: '/quan-tri/don-hang' },
    { label: 'Tài khoản', note: 'Thông tin người dùng và thành viên', value: overview?.totalUsers ?? 0, icon: 'bi-people', to: '/quan-tri/tai-khoan' },
    { label: 'Người bán & cửa hàng', note: `${overview?.totalSellers ?? 0} người bán`, value: overview?.totalShops ?? 0, icon: 'bi-shop', to: '/quan-tri/cua-hang' },
    { label: 'Mã giảm giá', note: 'Các mã đang hoạt động', value: overview?.activeCoupons ?? 0, icon: 'bi-ticket-perforated', to: '/quan-tri/ma-giam-gia' },
  ];

  return (
    <div className="admin-overview">
      {heading}
      <div className="admin-metrics" aria-label="Số liệu tổng hợp">
        {KPIS.map((kpi) => <Link to={kpi.to} key={kpi.label} className="admin-metric"><span>{kpi.label}</span><strong>{kpi.value}</strong><small>{kpi.caption}</small></Link>)}
      </div>
      <OrderCharts charts={overview?.charts} />
      <div className="admin-overview-columns">
        <section className="admin-surface">
          <div className="admin-section-heading"><h2>Vận hành cửa hàng</h2><span>Tổng dữ liệu hiện có</span></div>
          <div className="admin-operation-list">{operations.map((item) => <Link key={item.to} to={item.to} className="admin-operation"><i className={`bi ${item.icon}`} aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.note}</small></span><b>{Number(item.value).toLocaleString('vi-VN')}</b><i className="bi bi-chevron-right" aria-hidden="true" /></Link>)}</div>
        </section>
        <div className="admin-overview-side">
          <section className="admin-surface">
            <div className="admin-section-heading"><h2>Kiểm soát giao dịch</h2></div>
            <Link to="/quan-tri/rui-ro" className="admin-risk-summary"><span className="admin-status-dot" /><span><strong>{overview?.highRiskPredictions ?? 0} kết quả rủi ro cao</strong><small>Bao gồm mức cao và nghiêm trọng</small></span><i className="bi bi-arrow-up-right" aria-hidden="true" /></Link>
            <div className="admin-compact-row"><span>Mô hình đang hoạt động</span><Link to="/quan-tri/mo-hinh">{overview?.activeModels ?? 0}</Link></div>
            <div className="admin-compact-row"><span>Bản ghi hoạt động</span><Link to="/quan-tri/nhat-ky">{Number(overview?.auditLogCount ?? 0).toLocaleString('vi-VN')}</Link></div>
          </section>
          <section className="admin-surface admin-loyalty-entry"><div className="admin-section-heading"><h2>Khách hàng thân thiết</h2><i className="bi bi-gem" aria-hidden="true" /></div><p>Quản lý điểm, chính sách và quyền lợi của thành viên.</p><Link to="/quan-tri/khach-hang-than-thiet" className="admin-text-link">Mở chương trình <i className="bi bi-arrow-right" aria-hidden="true" /></Link></section>
        </div>
      </div>
    </div>
  );
}
