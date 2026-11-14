import { valueLabel, recommendationText, formatDateTime } from '../common/format';
import { AdminTable } from './AdminTable';
import { useAdminData } from './adminData';
import { api } from '../common/api';

export default function AdminRecommendationsPage() {
  const { rows, loading, error } = useAdminData(() => api.getRecommendations());

  return (
    <AdminTable
      title="Thống kê đề xuất"
      columns={['Mã', 'Tiêu đề', 'Loại', "Khách hàng", "Mức rủi ro", 'Quyết định mới nhất', 'Ngày tạo']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(item) => (
        <tr key={String(item.id)}>
          <td>{String(item.id)}</td>
          <td className="fw-semibold">{recommendationText(item.title)}</td>
          <td>{valueLabel(item.actionType)}</td>
          <td>{item.prediction?.buyer?.email ?? '—'}</td>
          <td>{valueLabel(item.prediction?.riskLevel)}</td>
          <td>{item.latestAction ? valueLabel(item.latestAction.decision) : 'Chưa xử lý'}</td>
          <td>{formatDateTime(item.createdAt)}</td>
        </tr>
      )}
    />
  );
}
