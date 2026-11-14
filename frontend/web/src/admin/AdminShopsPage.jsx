import { valueLabel, formatDateTime } from '../common/format';
import { AdminTable } from './AdminTable';
import { useAdminData } from './adminData';
import { api } from '../common/api';

export default function AdminShopsPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminShops());

  return (
    <AdminTable
      title="Quản lý Shops"
      columns={["Cửa hàng", 'Chủ sở hữu', 'Sản phẩm', 'Đơn hàng', 'Trạng thái', 'Ngày tạo']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(shop) => (
        <tr key={String(shop.id)}>
          <td className="fw-semibold">{shop.name}</td>
          <td>{shop.owner?.email ?? '—'}</td>
          <td>{shop.productCount}</td>
          <td>{shop.orderCount}</td>
          <td>{valueLabel(shop.status)}</td>
          <td>{formatDateTime(shop.createdAt)}</td>
        </tr>
      )}
    />
  );
}
