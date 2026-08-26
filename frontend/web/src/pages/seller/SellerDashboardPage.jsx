import { Link } from 'react-router-dom';
import {
  getSellerStats,
  getSellerProducts,
  getSellerOrders,
} from '../../services/mockService';
import { formatCurrency, formatDateTime } from '../../utils/format';

const ORDER_STATUS_META = {
  NEW: { label: 'Đơn mới', color: '#3b82f6' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#f59e0b' },
  PROCESSING: { label: 'Đang xử lý', color: '#8b5cf6' },
  SHIPPING: { label: 'Đang giao', color: '#06b6d4' },
  COMPLETED: { label: 'Hoàn thành', color: '#16a34a' },
  CANCELLED: { label: 'Đã hủy', color: '#dc2626' },
};

function MiniBarChart({ data, color = '#ee4d2d', suffix = '' }) {
  const max = Math.max(...data, 1);

  return (
    <div className="d-flex align-items-end gap-2" style={{ height: 120 }}>
      {data.map((value, index) => (
        <div
          key={index}
          className="flex-grow-1 rounded-top"
          style={{
            height: `${(value / max) * 100}%`,
            background: color,
            opacity: 0.55 + (value / max) * 0.45,
            minHeight: 6,
          }}
          title={`${value}${suffix}`}
        />
      ))}
    </div>
  );
}

function SellerDashboardPage() {
  const stats = getSellerStats();
  const products = getSellerProducts();
  const orders = getSellerOrders();

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <i className="bi bi-speedometer2" style={{ fontSize: 24, color: '#ee4d2d' }} />
        <h1 className="h5 fw-bold mb-0">Seller Dashboard</h1>

        <div className="ms-auto d-flex gap-2">
          <Link to="/seller" className="btn btn-sm text-white" style={{ background: '#ee4d2d' }}>
            Tổng quan
          </Link>
          <Link to="/risk" className="btn btn-sm btn-outline-secondary">
            Risk Analysis
          </Link>
          <Link to="/recommendations" className="btn btn-sm btn-outline-secondary">
            AI Recommendation
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-3">
        {[
          {
            label: 'Doanh thu (tháng)',
            value: formatCurrency(stats.revenue),
            icon: 'bi-currency-dollar',
            color: '#16a34a',
          },
          {
            label: 'Số đơn hàng',
            value: stats.orders.toLocaleString('vi-VN'),
            icon: 'bi-receipt',
            color: '#3b82f6',
          },
          {
            label: 'Sản phẩm',
            value: stats.products,
            icon: 'bi-box-seam',
            color: '#f59e0b',
          },
          {
            label: 'Khách hàng',
            value: stats.customers.toLocaleString('vi-VN'),
            icon: 'bi-people',
            color: '#8b5cf6',
          },
          {
            label: 'Tỷ lệ hoàn thành',
            value: `${stats.completionRate}%`,
            icon: 'bi-check-circle',
            color: '#0ea5e9',
          },
          {
            label: 'Risk Score',
            value: stats.riskScore,
            icon: 'bi-shield-exclamation',
            color: stats.riskScore >= 50 ? '#dc2626' : '#16a34a',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="col-6 col-md-4 col-xl-2">
            <div
              className="bg-white rounded-3 border p-3 h-100"
              style={{ borderColor: '#f1f1f1' }}
            >
              <i className={`bi ${kpi.icon}`} style={{ color: kpi.color, fontSize: 20 }} />
              <div className="fw-bold mt-1" style={{ fontSize: 17 }}>
                {kpi.value}
              </div>
              <small className="text-muted">{kpi.label}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Cảnh báo */}
      {stats.alerts.length > 0 && (
        <div className="mb-3">
          {stats.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert ${
                alert.level === 'warning' ? 'alert-warning' : 'alert-info'
              } py-2 small d-flex align-items-center gap-2 mb-2`}
            >
              <i className="bi bi-exclamation-triangle-fill" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div
            className="bg-white rounded-3 border p-3 h-100"
            style={{ borderColor: '#f1f1f1' }}
          >
            <h2 className="h6 fw-bold mb-3">Doanh thu 7 ngày (triệu ₫)</h2>
            <MiniBarChart data={stats.revenueByDay} suffix="tr" />
          </div>
        </div>

        <div className="col-lg-6">
          <div
            className="bg-white rounded-3 border p-3 h-100"
            style={{ borderColor: '#f1f1f1' }}
          >
            <h2 className="h6 fw-bold mb-3">Đơn hàng 7 ngày</h2>
            <MiniBarChart data={stats.ordersByDay} color="#3b82f6" suffix=" đơn" />
          </div>
        </div>

        <div className="col-lg-6">
          <div
            className="bg-white rounded-3 border p-3 h-100"
            style={{ borderColor: '#f1f1f1' }}
          >
            <h2 className="h6 fw-bold mb-3">Sản phẩm bán chạy</h2>

            {stats.topProducts.map((product, index) => (
              <div key={product.name} className="d-flex align-items-center gap-2 small mb-2">
                <span
                  className="d-flex align-items-center justify-content-center rounded-circle fw-bold text-white flex-shrink-0"
                  style={{ width: 24, height: 24, background: '#ee4d2d', fontSize: 11 }}
                >
                  {index + 1}
                </span>

                <span className="text-truncate flex-grow-1">{product.name}</span>
                <span className="fw-semibold">{product.sold}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-6">
          <div
            className="bg-white rounded-3 border p-3 h-100"
            style={{ borderColor: '#f1f1f1' }}
          >
            <h2 className="h6 fw-bold mb-3">Risk Distribution</h2>

            {stats.riskDistribution.map((item) => {
              const colors = {
                Thấp: '#16a34a',
                'Trung bình': '#f59e0b',
                Cao: '#dc2626',
              };

              return (
                <div key={item.label} className="mb-2">
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{item.label}</span>
                    <span className="fw-semibold">{item.value}%</span>
                  </div>

                  <div className="progress" style={{ height: 8 }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{
                        width: `${item.value}%`,
                        background: colors[item.label],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Đơn gần đây */}
      <div
        className="bg-white rounded-3 border p-3 mb-3"
        style={{ borderColor: '#f1f1f1' }}
      >
        <h2 className="h6 fw-bold mb-3">Đơn hàng gần đây</h2>

        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle mb-0 small">
            <thead>
              <tr className="text-muted">
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Ngày</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const meta = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.NEW;

                return (
                  <tr key={order.id}>
                    <td className="fw-semibold">{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>
                      <span
                        className="badge rounded-pill"
                        style={{ background: `${meta.color}1a`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sản phẩm của shop */}
      <div
        className="bg-white rounded-3 border p-3"
        style={{ borderColor: '#f1f1f1' }}
      >
        <h2 className="h6 fw-bold mb-3">Sản phẩm của shop</h2>

        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle mb-0 small">
            <thead>
              <tr className="text-muted">
                <th>Sản phẩm</th>
                <th>Giá</th>
                <th>Tồn kho</th>
                <th>Đã bán</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="fw-semibold">{product.name}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td className={product.stock < 10 ? 'text-danger fw-semibold' : ''}>
                    {product.stock}
                  </td>
                  <td>{product.sold}</td>
                  <td>
                    <span
                      className={`badge rounded-pill ${
                        product.active
                          ? 'bg-success-subtle text-success'
                          : 'bg-secondary-subtle text-secondary'
                      }`}
                    >
                      {product.active ? 'Đang bán' : 'Ẩn'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SellerDashboardPage;
