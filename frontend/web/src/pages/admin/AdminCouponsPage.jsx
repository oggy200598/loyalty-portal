import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/format';

const DISCOUNT_LABELS = {
  PERCENT: 'Giảm %',
  FIXED: 'Giảm tiền',
  FREE_SHIP: 'Freeship',
};

function describeDiscount(coupon) {
  if (coupon.discountType === 'FREE_SHIP') return 'Miễn phí vận chuyển';
  if (coupon.discountType === 'PERCENT') {
    return `Giảm ${coupon.discountValue}%${
      coupon.maxDiscount ? ` (tối đa ${formatCurrency(coupon.maxDiscount)})` : ''
    }`;
  }
  return `Giảm ${formatCurrency(coupon.discountValue)}`;
}

/** Quản lý mã giảm giá (coupons) — dữ liệu thật từ bảng coupons. */
export default function AdminCouponsPage() {
  const { rows, loading, error } = useAdminData(() => api.getCoupons());

  return (
    <AdminTable
      title="Quản lý Mã giảm giá"
      columns={['Mã', 'Tên', 'Giảm giá', 'Đơn tối thiểu', 'Dùng', 'Hạn', 'Trạng thái']}
      rows={rows}
      loading={loading}
      error={error}
      emptyText="Chưa có mã giảm giá nào trong hệ thống"
      renderRow={(coupon) => (
        <tr key={String(coupon.id)}>
          <td className="fw-semibold" style={{ color: '#ee4d2d' }}>{coupon.code}</td>
          <td>{coupon.name}</td>
          <td>
            {describeDiscount(coupon)}
            <small className="text-muted d-block">
              {DISCOUNT_LABELS[coupon.discountType] ?? coupon.discountType}
            </small>
          </td>
          <td>{formatCurrency(coupon.minOrderValue)}</td>
          <td>
            {coupon.usedCount}
            {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
          </td>
          <td>{formatDate(coupon.endAt)}</td>
          <td>
            {coupon.status === 'ACTIVE' ? (
              <span className="badge text-bg-success">ACTIVE</span>
            ) : (
              <span className="badge text-bg-secondary">{coupon.status}</span>
            )}
          </td>
        </tr>
      )}
    />
  );
}
