import { useState } from 'react';
import { LOYALTY_LABELS } from './loyaltyUtils';

export function LoyaltyFilters({ onApply, statuses = [], transactions = false, dates = true, members = false, audit = false, actors = [] }) {
  const [values, setValues] = useState({});
  const change = (key, value) => setValues((old) => ({ ...old, [key]: value }));
  function apply(event) {
    event.preventDefault();
    const filters = { ...values };
    if (filters.from) filters.from = new Date(`${filters.from}T00:00:00`).toISOString();
    if (filters.to) filters.to = new Date(`${filters.to}T23:59:59.999`).toISOString();
    onApply(filters);
  }
  return <form className="row g-2 mb-3 align-items-end" onSubmit={apply}>
    <label className="col-sm">Tìm kiếm<input className="form-control form-control-sm mt-1" maxLength={150} value={values.q ?? ''} onChange={(e) => change('q', e.target.value)} placeholder={members ? 'Tên, tài khoản, điện thoại' : audit ? 'Sự kiện hoặc đối tượng' : 'Nội dung'} /></label>
    {statuses.length > 0 && <label className="col-sm">Trạng thái<select className="form-select form-select-sm mt-1" value={values.status ?? ''} onChange={(e) => change('status', e.target.value)}><option value="">Tất cả</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
    {members && <label className="col-sm">Mã hạng<input className="form-control form-control-sm mt-1" pattern="[A-Z][A-Z0-9_]{0,29}" value={values.tier ?? ''} onChange={(e) => change('tier', e.target.value.toUpperCase())} placeholder="Ví dụ: SILVER" /></label>}
    {transactions && <label className="col-sm">Loại giao dịch<select className="form-select form-select-sm mt-1" value={values.kind ?? ''} onChange={(e) => change('kind', e.target.value)}><option value="">Tất cả</option>{['EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE', 'REVERSAL'].map((kind) => <option value={kind} key={kind}>{LOYALTY_LABELS[kind]}</option>)}</select></label>}
    {dates && <><label className="col-sm">Từ ngày<input type="date" className="form-control form-control-sm mt-1" value={values.from ?? ''} onChange={(e) => change('from', e.target.value)} /></label><label className="col-sm">Đến ngày<input type="date" className="form-control form-control-sm mt-1" min={values.from} value={values.to ?? ''} onChange={(e) => change('to', e.target.value)} /></label></>}
    {audit && <label className="col-sm">Người thao tác<select className="form-select form-select-sm mt-1" value={values.actorId ?? ''} onChange={(e) => change('actorId', e.target.value)}><option value="">Tất cả người thao tác</option>{actors.map(actor => <option key={actor.id} value={actor.id}>{actor.full_name ? `${actor.full_name} (${actor.email})` : actor.email}</option>)}</select></label>}
    <div className="col-auto d-flex gap-2"><button className="btn btn-sm btn-primary">Áp dụng</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setValues({}); onApply({}); }}>Xóa lọc</button></div>
  </form>;
}

export function LoyaltyPanel({ title, children }) {
  return <section className="loyalty-panel bg-white border rounded-3 p-3 p-md-4 mb-3"><h2 className="h6 fw-bold mb-3">{title}</h2>{children}</section>;
}

export function LoyaltyPager({ pagination, onPage }) {
  if (!pagination || pagination.totalPages < 2) return null;
  return <nav aria-label="Phân trang Khách hàng thân thiết" className="d-flex justify-content-center align-items-center gap-3 my-3">
    <button className="btn btn-sm btn-outline-secondary" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Trước</button>
    <span>Trang {pagination.page}/{pagination.totalPages}</span>
    <button className="btn btn-sm btn-outline-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Sau</button>
  </nav>;
}

export function LoyaltyTable({ columns, children, empty }) {
  return <div className="table-responsive"><table className="table align-middle small"><thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
    <tbody>{empty ? <tr><td colSpan={columns.length} className="text-center text-muted py-4">Chưa có dữ liệu</td></tr> : children}</tbody></table></div>;
}
