const SEGMENTS = {
  login: 'dang-nhap', register: 'dang-ky', 'forgot-password': 'quen-mat-khau',
  'reset-password': 'dat-lai-mat-khau', account: 'tai-khoan', profile: 'ho-so',
  addresses: 'dia-chi', password: 'mat-khau', products: 'san-pham', categories: 'danhmuc', 'danh-muc': 'danhmuc',
  search: 'tim-kiem', shops: 'cua-hang', 'flash-sale': 'gio-vang', coupons: 'ma-giam-gia',
  loyalty: 'khach-hang-than-thiet', cart: 'gio-hang', checkout: 'thanh-toan',
  'order-success': 'dat-hang-thanh-cong', orders: 'don-hang', wishlist: 'yeu-thich',
  notifications: 'thong-bao', seller: 'nguoi-ban', admin: 'quan-tri', users: 'tai-khoan',
  sellers: 'nguoi-ban', analytics: 'phan-tich', risk: 'rui-ro', settings: 'cai-dat',
  models: 'mo-hinh', recommendations: 'de-xuat', 'audit-logs': 'nhat-ky',
  new: 'them-moi', edit: 'chinh-sua', dashboard: 'tong-quan', 'risk-actions': 'xu-ly-rui-ro',
  '403': 'khong-co-quyen',
};

// Only UI paths change. API endpoints, IDs, query values and recovery tokens stay intact.
export function vietnamesePath(path) {
  const boundary = path.search(/[?#]/);
  const pathname = boundary < 0 ? path : path.slice(0, boundary);
  const suffix = boundary < 0 ? '' : path.slice(boundary);
  const parts = pathname.split('/');
  if (!SEGMENTS[parts[1]]) return path;
  return parts.map(part => SEGMENTS[part] ?? part).join('/') + suffix;
}
