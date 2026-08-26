import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/format';

export default function AdminRecommendationsPage() {
  const { rows, loading, error } = useAdminData(() => api.getRecommendations());

  return (
    <AdminTable
      title="Recommendation Statistics"
      columns={['ID', 'Tiêu đề', 'Loại', 'Buyer', 'Risk Level', 'Quyết định mới nhất', 'Ngày tạo']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(item) => (
        <tr key={String(item.id)}>
          <td>{String(item.id)}</td>
          <td className="fw-semibold">{item.title}</td>
          <td>{item.actionType}</td>
          <td>{item.prediction?.buyer?.email ?? '—'}</td>
          <td>{item.prediction?.riskLevel ?? '—'}</td>
          <td>{item.latestAction?.decision ?? 'Chưa xử lý'}</td>
          <td>{formatDateTime(item.createdAt)}</td>
        </tr>
      )}
    />
  );
}
