import { useState } from 'react';

export function AdminEditor({ title, busy, error, onSubmit, onClose, children }) {
  return <section className="admin-surface admin-editor mb-4" aria-label={title}>
    <div className="admin-section-heading"><h2>{title}</h2><button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={onClose}>Đóng</button></div>
    <form onSubmit={(event) => { event.preventDefault(); void onSubmit(); }}>
      <fieldset disabled={busy} className="p-3 p-md-4">
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="row g-3">{children}</div>
        <div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-outline-secondary" onClick={onClose}>Hủy</button><button type="submit" className="btn btn-primary">{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
      </fieldset>
    </form>
  </section>;
}

export function AdminFilters({ onSearch, onRefresh, loading, statuses, placeholder = 'Tìm theo tên...', children }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  return <form className="admin-list-toolbar" onSubmit={(event) => { event.preventDefault(); onSearch({ q: q.trim(), status }); }}>
    <label className="admin-search-field"><span className="visually-hidden">Tìm kiếm</span><i className="bi bi-search" aria-hidden="true" /><input className="form-control" name="q" maxLength={100} placeholder={placeholder} value={q} onChange={(event) => setQ(event.target.value)} /></label>
    <label><span className="visually-hidden">Lọc trạng thái</span><select className="form-select" aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <button className="btn btn-outline-secondary" type="submit" disabled={loading}>Tìm kiếm</button>
    {(q || status) && <button className="btn btn-outline-secondary" type="button" disabled={loading} onClick={() => { setQ(''); setStatus(''); onSearch({ q: '', status: '' }); }}>Bỏ lọc</button>}
    <button type="button" className="btn btn-outline-secondary" disabled={loading} onClick={onRefresh} aria-label="Làm mới danh sách"><i className="bi bi-arrow-clockwise" aria-hidden="true" /></button>
    <div className="ms-auto">{children}</div>
  </form>;
}
