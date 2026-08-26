import { formatDateTime } from '../../utils/format';

/** Bảng dùng chung cho các trang danh sách của Admin. */
export function AdminTable({ title, columns, rows, renderRow, loading, error, emptyText }) {
  return (
    <div>
      <h1 className="h5 fw-bold mb-3">{title}</h1>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {loading ? (
        <div className="text-center text-muted py-5">Đang tải...</div>
      ) : !rows || rows.length === 0 ? (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          {emptyText ?? 'Không có dữ liệu'}
        </div>
      ) : (
        <div className="bg-white rounded-3 border p-3" style={{ borderColor: '#e5e7eb' }}>
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0 small">
              <thead>
                <tr className="text-muted">
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows.map(renderRow)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export { formatDateTime };
