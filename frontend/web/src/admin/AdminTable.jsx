
/** Bảng dùng chung cho các trang danh sách của Admin. */
export function AdminTable({ title, columns, rows, renderRow, loading, error, emptyText, toolbar }) {
  return (
    <div>
      <div className="admin-table-heading"><h1>{title}</h1>{!loading && !error && <span className="admin-record-count">{rows?.length ?? 0} bản ghi</span>}</div>
      {toolbar}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {loading ? (
        <div className="admin-loading" role="status">Đang tải dữ liệu...</div>
      ) : !rows || rows.length === 0 ? (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          {emptyText ?? 'Không có dữ liệu'}
        </div>
      ) : (
        <div className="admin-table-surface">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" aria-label={title}>
              <thead>
                <tr className="text-muted">
                  {columns.map((column) => (
                    <th key={column} scope="col">{column}</th>
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
