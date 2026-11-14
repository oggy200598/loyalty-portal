import ManagementLayout from '../common/ManagementLayout';

const NAV_ITEMS = [
  { to: '/quan-tri', label: 'Tổng quan', icon: 'bi-house-door', end: true, group: 'Cửa hàng' },
  { to: '/quan-tri/don-hang', label: 'Đơn hàng', icon: 'bi-receipt', group: 'Cửa hàng' },
  { to: '/quan-tri/san-pham', label: 'Sản phẩm', icon: 'bi-box-seam', group: 'Cửa hàng' },
  { to: '/quan-tri/danh-muc', label: 'Danh mục', icon: 'bi-grid', group: 'Cửa hàng' },
  { to: '/quan-tri/cua-hang', label: 'Cửa hàng', icon: 'bi-shop', group: 'Cửa hàng' },
  { to: '/quan-tri/nguoi-ban', label: 'Người bán', icon: 'bi-person-badge', group: 'Cửa hàng' },
  { to: '/quan-tri/tai-khoan', label: 'Tài khoản', icon: 'bi-people', group: 'Khách hàng' },
  { to: '/quan-tri/khach-hang-than-thiet', label: 'Khách hàng thân thiết', icon: 'bi-gem', group: 'Khách hàng' },
  { to: '/quan-tri/ma-giam-gia', label: 'Mã giảm giá', icon: 'bi-ticket-perforated', group: 'Khách hàng' },
  { to: '/quan-tri/rui-ro', label: 'Rủi ro giao dịch', icon: 'bi-shield-check', group: 'Phân tích' },
  { to: '/quan-tri/de-xuat', label: 'Đề xuất xử lý', icon: 'bi-list-check', group: 'Phân tích' },
  { to: '/quan-tri/mo-hinh', label: 'Mô hình dự đoán', icon: 'bi-cpu', group: 'Phân tích' },
  { to: '/quan-tri/nhat-ky', label: 'Nhật ký hoạt động', icon: 'bi-clock-history', group: 'Hệ thống' },
  { to: '/quan-tri/cai-dat', label: 'Cài đặt', icon: 'bi-gear', group: 'Hệ thống' },
];

export default function AdminLayout() {
  return <ManagementLayout home="/quan-tri" title="Quản trị cửa hàng" section="Quản trị" navItems={NAV_ITEMS} variant="admin" />;
}
