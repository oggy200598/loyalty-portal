import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/format';

export default function AdminAuditLogsPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminAuditLogs(100));

  return (
    <AdminTable
      title="Audit Logs"
      columns={['Thời gian', 'User', 'Hành động', 'Entity', 'Entity ID']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(log) => (
        <tr key={String(log.id)}>
          <td>{formatDateTime(log.created_at)}</td>
          <td>{log.users?.email ?? '—'}</td>
          <td>{log.action}</td>
          <td>{log.entity_type}</td>
          <td>{log.entity_id !== null && log.entity_id !== undefined ? String(log.entity_id) : '—'}</td>
        </tr>
      )}
    />
  );
}
