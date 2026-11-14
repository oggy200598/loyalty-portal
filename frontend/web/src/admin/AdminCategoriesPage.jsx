import { useState } from 'react';
import { AdminTable } from './AdminTable';
import { AdminEditor, AdminFilters } from './AdminEditor';
import { useAdminList } from './adminData';
import { LoyaltyPager } from '../loyalty/LoyaltyUI';
import { api } from '../common/api';

const STATUSES = [['ACTIVE', 'Đang hiển thị'], ['INACTIVE', 'Đã ẩn']];
export default function AdminCategoriesPage() {
  const list = useAdminList(api.getAdminCategories);
  const [form, setForm] = useState(null);
  const [parents, setParents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function open(row) {
    setBusy(true); setError(''); setNotice('');
    try {
      setParents((await api.getAdminCatalogOptions()).categories);
      setForm(row ? { id: row.id, name: row.name, description: row.description || '', parentId: String(row.parent_id ?? ''), status: row.status, originalName: row.name, originalDescription: row.description || '', originalParentId: String(row.parent_id ?? ''), originalStatus: row.status } : { name: '', description: '', parentId: '', status: 'ACTIVE' });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), parentId: form.parentId || null, status: form.status };
      if (form.id) await api.updateAdminCategory(form.id, { ...payload, originalName: form.originalName, originalDescription: form.originalDescription, originalParentId: form.originalParentId || null, originalStatus: form.originalStatus });
      else await api.createAdminCategory(payload);
      setForm(null); setNotice('Đã lưu danh mục.'); list.refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <>
    {notice && <div className="alert alert-success" role="status">{notice}</div>}
    {error && !form && <div className="alert alert-danger" role="alert">{error}</div>}
    {form && <AdminEditor title={form.id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'} busy={busy} error={error} onSubmit={save} onClose={() => { setForm(null); setError(''); }}>
      <label className="col-12">Tên danh mục<input className="form-control mt-1" name="name" required maxLength={255} value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus /></label>
      <label className="col-md-6">Danh mục cha<select className="form-select mt-1" name="parentId" value={form.parentId} onChange={(e) => set('parentId', e.target.value)}><option value="">Không có danh mục cha</option>{parents.filter((row) => String(row.id) !== String(form.id)).map((row) => <option key={row.id} value={String(row.id)}>{row.name}</option>)}</select></label>
      <label className="col-md-6">Trạng thái<select className="form-select mt-1" name="status" value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="col-12">Mô tả<textarea className="form-control mt-1" name="description" rows={3} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
      <p className="small text-muted mb-0">Ẩn danh mục sẽ bỏ danh mục khỏi menu mua hàng. Sản phẩm bên trong giữ trạng thái riêng.</p>
    </AdminEditor>}
    <AdminTable title="Danh mục" columns={['Tên danh mục', 'Danh mục cha', 'Sản phẩm', 'Trạng thái', 'Thao tác']} rows={list.rows} loading={list.loading} error={list.error}
      toolbar={<AdminFilters onSearch={list.search} onRefresh={list.refresh} loading={list.loading || busy} statuses={STATUSES} placeholder="Tìm tên danh mục..."><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void open(null)}>Thêm danh mục</button></AdminFilters>}
      renderRow={(row) => <tr key={String(row.id)}><td><strong>{row.name}</strong><small>{row.description || '—'}</small></td><td>{row.categories?.name || '—'}</td><td>{row._count.products}</td><td>{row.status === 'ACTIVE' ? 'Đang hiển thị' : 'Đã ẩn'}</td><td><button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => void open(row)}>Chỉnh sửa</button></td></tr>} />
    <LoyaltyPager pagination={list.pagination} onPage={list.changePage} />
  </>;
}
