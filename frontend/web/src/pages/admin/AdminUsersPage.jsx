import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/format';

export default function AdminUsersPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminUsers());

  return (
    <AdminTable
      title="Quản lý Users"
      columns={['Email', 'Họ tên', 'Vai trò', 'Đơn hàng', 'Trạng thái', 'Ngày tạo']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(user) => (
        <tr key={user.id}>
          <td>{user.email}</td>
          <td>{user.fullName ?? '—'}</td>
          <td>
            {(user.roles ?? []).map((role) => (
              <span key={role} className="badge text-bg-secondary me-1">{role}</span>
            ))}
          </td>
          <td>{user.orderCount}</td>
          <td>{user.status}</td>
          <td>{formatDateTime(user.createdAt)}</td>
        </tr>
      )}
    />
  );
}
