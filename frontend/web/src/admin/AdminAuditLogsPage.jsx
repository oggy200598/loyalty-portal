import { valueLabel, formatDateTime } from '../common/format';
import { AdminTable } from './AdminTable';
import { useAdminData } from './adminData';
import { api } from '../common/api';

export default function AdminAuditLogsPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminAuditLogs(100));

  return (
    <AdminTable
      title="Nhật ký hệ thống"
      columns={['Thời gian', "Tài khoản", 'Hành động', "Đối tượng", "Mã đối tượng"]}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(log) => (
        <tr key={String(log.id)}>
          <td>{formatDateTime(log.created_at)}</td>
          <td>{log.users?.email ?? '—'}</td>
          <td>{valueLabel(log.action)}</td>
          <td>{valueLabel(log.entity_type)}</td>
          <td>{log.entity_id !== null && log.entity_id !== undefined ? String(log.entity_id) : '—'}</td>
        </tr>
      )}
    />
  );
}
