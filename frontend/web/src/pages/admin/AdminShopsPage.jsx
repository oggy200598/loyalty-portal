import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/format';

export default function AdminShopsPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminShops());

  return (
    <AdminTable
      title="Quản lý Shops"
      columns={['Shop', 'Chủ sở hữu', 'Sản phẩm', 'Đơn hàng', 'Trạng thái', 'Ngày tạo']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(shop) => (
        <tr key={String(shop.id)}>
          <td className="fw-semibold">{shop.name}</td>
          <td>{shop.owner?.email ?? '—'}</td>
          <td>{shop.productCount}</td>
          <td>{shop.orderCount}</td>
          <td>{shop.status}</td>
          <td>{formatDateTime(shop.createdAt)}</td>
        </tr>
      )}
    />
  );
}
