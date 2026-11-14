import { valueLabel, formatDateTime } from '../common/format';
import { AdminTable } from './AdminTable';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoyaltyPager } from '../loyalty/LoyaltyUI';
import { api } from '../common/api';
import { useAdminList } from './adminData';
import { AdminEditor, AdminFilters } from './AdminEditor';
import { useAuth } from '../accounts/authContext';

export default function AdminUsersPage() {
  const list = useAdminList(api.getAdminUsers);
  const { user: operator, refreshUser } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [notice, setNotice] = useState('');
  async function open(user) {
    setBusy(true); setEditError(''); setNotice('');
    try { const current = await api.getAdminUser(user.id); setForm({ id: current.id, email: current.email, fullName: current.full_name || '', phone: current.phone || '', status: current.status, expectedUpdatedAt: current.updated_at }); }
    catch (err) { setEditError(err.message); }
    finally { setBusy(false); }
  }
  async function save() {
    if (busy) return;
    setBusy(true); setEditError('');
    try {
      await api.updateAdminUser(form.id, { fullName: form.fullName.trim(), phone: form.phone.trim(), status: form.status, expectedUpdatedAt: form.expectedUpdatedAt });
      if (form.id === operator?.id) await refreshUser?.();
      setForm(null); setNotice('Đã lưu tài khoản. Thông tin thành viên KHTT được cập nhật cùng dữ liệu.'); list.refresh();
    } catch (err) { setEditError(err.message); }
    finally { setBusy(false); }
  }
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <>
    {notice && <div className="alert alert-success" role="status">{notice}</div>}
    {editError && !form && <div className="alert alert-danger" role="alert">{editError}</div>}
    {form && <AdminEditor title="Chỉnh sửa tài khoản" busy={busy} error={editError} onSubmit={save} onClose={() => { setForm(null); setEditError(''); }}>
      <label className="col-12">Thư điện tử / Tài khoản<input className="form-control mt-1" readOnly value={form.email} /></label>
      <label className="col-md-6">Họ tên<input className="form-control mt-1" name="fullName" required maxLength={255} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoFocus /></label>
      <label className="col-md-6">Điện thoại<input className="form-control mt-1" name="phone" type="tel" maxLength={20} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
      <label className="col-12">Trạng thái<select className="form-select mt-1" name="status" value={form.status} onChange={(e) => set('status', e.target.value)}><option value="ACTIVE">Đang hoạt động</option><option value="SUSPENDED" disabled={form.id === operator?.id}>Khóa tài khoản</option></select></label>
    </AdminEditor>}
    <AdminTable
      title="Quản lý tài khoản"
      columns={['Thư điện tử', 'Họ tên', 'Điện thoại', 'Vai trò', 'Thành viên KHTT', 'Đơn hàng', 'Trạng thái', 'Ngày tạo', 'Thao tác']}
      rows={list.rows}
      loading={list.loading}
      error={list.error}
      toolbar={<AdminFilters onSearch={list.search} onRefresh={list.refresh} loading={list.loading || busy} statuses={[['ACTIVE', 'Đang hoạt động'], ['SUSPENDED', 'Đã khóa'], ['DELETED', 'Đã xóa']]} placeholder="Tìm tên, thư điện tử, điện thoại..."><Link className="btn btn-outline-primary" to="/quan-tri/khach-hang-than-thiet">Quản lý KHTT</Link></AdminFilters>}
      renderRow={(user) => (
        <tr key={user.id}>
          <td>{user.email}</td>
          <td>{user.fullName ?? '—'}</td>
          <td>{user.phone || '—'}</td>
          <td>
            {(user.roles ?? []).map((role) => (
              <span key={role} className="badge text-bg-secondary me-1">{valueLabel(role)}</span>
            ))}
          </td>
          <td>{user.loyalty ? <><strong>{valueLabel(user.loyalty.tier_code)}</strong><span className="d-block">{user.loyalty.balance} điểm</span></> : user.roles?.includes('BUYER') && !user.roles.some((role) => ['ADMIN', 'SELLER'].includes(role)) ? 'Chưa đồng bộ' : 'Không áp dụng'}</td>
          <td>{user.orderCount}</td>
          <td>{({ ACTIVE: 'Đang hoạt động', SUSPENDED: 'Đã khóa', DELETED: 'Đã xóa' })[user.status] || user.status}</td>
          <td>{formatDateTime(user.createdAt)}</td>
          <td><button className="btn btn-sm btn-outline-secondary" disabled={busy || user.status === 'DELETED'} onClick={() => void open(user)}>Chỉnh sửa</button></td>
        </tr>
      )}
    />
    <LoyaltyPager pagination={list.pagination} onPage={list.changePage} />
    </>
  );
}
