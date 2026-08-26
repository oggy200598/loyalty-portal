import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function AdminProductsPage() {
  const { rows, loading, error } = useAdminData(() => api.getProducts(100));

  return (
    <AdminTable
      title="Quản lý Products"
      columns={['Sản phẩm', 'Shop', 'Giá', 'Tồn kho', 'Trạng thái']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(product) => (
        <tr key={String(product.id)}>
          <td className="fw-semibold">{product.name}</td>
          <td>{product.shop?.name ?? '—'}</td>
          <td>{formatCurrency(Number(product.price))}</td>
          <td>{product.stockQuantity}</td>
          <td>{product.status}</td>
        </tr>
      )}
    />
  );
}
