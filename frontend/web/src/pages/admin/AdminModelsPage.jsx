import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/format';

export default function AdminModelsPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminModels());

  return (
    <AdminTable
      title="ML Models"
      columns={['Model', 'Algorithm', 'Version', 'Accuracy', 'F1', 'ROC AUC', 'Predictions', 'Active', 'Ngày tạo']}
      rows={rows}
      loading={loading}
      error={error}
      renderRow={(model) => (
        <tr key={String(model.id)}>
          <td className="fw-semibold">{model.modelName}</td>
          <td>{model.algorithm}</td>
          <td>{model.version}</td>
          <td>{model.accuracy !== null ? `${(model.accuracy * 100).toFixed(1)}%` : '—'}</td>
          <td>{model.f1Score !== null ? Number(model.f1Score).toFixed(3) : '—'}</td>
          <td>{model.rocAuc !== null ? Number(model.rocAuc).toFixed(3) : '—'}</td>
          <td>{model.predictionCount}</td>
          <td>
            {model.isActive ? (
              <span className="badge text-bg-success">ACTIVE</span>
            ) : (
              <span className="badge text-bg-secondary">INACTIVE</span>
            )}
          </td>
          <td>{formatDateTime(model.createdAt)}</td>
        </tr>
      )}
    />
  );
}
