import { AdminTable } from './AdminTable';
import { useAdminData } from './adminData';
import { api } from '../common/api';
import { formatDateTime } from '../common/format';

export default function AdminModelsPage() {
  const { rows, loading, error } = useAdminData(() => api.getAdminModels());

  return (
    <AdminTable
      title="Mô hình dự đoán"
      columns={["Mô hình", "Thuật toán", "Phiên bản", "Độ chính xác", 'Điểm F1', 'Diện tích dưới đường cong ROC', "Lượt dự đoán", "Hoạt động", 'Ngày tạo']}
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
              <span className="badge text-bg-success">Đang hoạt động</span>
            ) : (
              <span className="badge text-bg-secondary">Ngừng hoạt động</span>
            )}
          </td>
          <td>{formatDateTime(model.createdAt)}</td>
        </tr>
      )}
    />
  );
}
