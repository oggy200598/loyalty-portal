import ManagementLayout from '../common/ManagementLayout';

const NAV_ITEMS = [
  { to: '/nguoi-ban', label: "Tổng quan", icon: 'bi-speedometer2', end: true, group: 'Cửa hàng' },
  { to: '/nguoi-ban/san-pham', label: 'Sản phẩm', icon: 'bi-box-seam', group: 'Cửa hàng' },
  { to: '/nguoi-ban/don-hang', label: 'Đơn hàng', icon: 'bi-receipt', group: 'Cửa hàng' },
  { to: '/nguoi-ban/ma-giam-gia', label: "Mã giảm giá", icon: 'bi-ticket-perforated', group: 'Cửa hàng' },
  { to: '/nguoi-ban/phan-tich', label: 'Phân tích', icon: 'bi-graph-up', group: 'Phân tích' },
  { to: '/nguoi-ban/rui-ro', label: "Rủi ro", icon: 'bi-shield-exclamation', group: 'Phân tích' },
  { to: '/nguoi-ban/cai-dat', label: 'Cài đặt', icon: 'bi-gear', group: 'Tài khoản' },
];

export default function SellerLayout() {
  return <ManagementLayout home="/nguoi-ban" title="Kênh người bán" section="Người bán" navItems={NAV_ITEMS} variant="seller" />;
}
