import { valueLabel } from '../common/format';
import { AdminTable } from './AdminTable';
import { useAdminData } from './adminData';
import { api } from '../common/api';

export default function AdminSellersPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminSellers());

  return (
    <AdminTable
      title="Quản lý người bán"
      columns={['Thư điện tử', 'Họ tên', "Cửa hàng", 'Sản phẩm', 'Đơn hàng', 'Trạng thái']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(seller) => (
        <tr key={seller.id}>
          <td>{seller.email}</td>
          <td>{seller.fullName ?? '—'}</td>
          <td>
            {(seller.shops ?? []).length === 0
              ? '—'
              : (seller.shops ?? []).map((shop) => (
                  <div key={shop.id}>{shop.name}</div>
                ))}
          </td>
          <td>
            {(seller.shops ?? []).reduce((sum, shop) => sum + (shop.productCount ?? 0), 0)}
          </td>
          <td>
            {(seller.shops ?? []).reduce((sum, shop) => sum + (shop.orderCount ?? 0), 0)}
          </td>
          <td>{valueLabel(seller.status)}</td>
        </tr>
      )}
    />
  );
}
