import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';

export default function AdminCategoriesPage() {
  const { rows, loading, error } = useAdminData(() => api.getCategories());

  return (
    <AdminTable
      title="Quản lý Categories"
      columns={['ID', 'Tên danh mục', 'Mô tả', 'Trạng thái']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(category) => (
        <tr key={String(category.id)}>
          <td>{String(category.id)}</td>
          <td className="fw-semibold">{category.name}</td>
          <td>{category.description ?? '—'}</td>
          <td>{category.status}</td>
        </tr>
      )}
    />
  );
}
