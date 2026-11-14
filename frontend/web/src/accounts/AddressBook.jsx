import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../common/api';
const empty = { receiverName: '', phone: '', province: '', district: '', ward: '', addressDetail: '', isDefault: false };
const draft = row => ({ id: row.id, version: row.version, receiverName: row.receiver_name, phone: row.phone, province: row.province, district: row.district, ward: row.ward, addressDetail: row.address_detail, isDefault: row.is_default });
const fields = [['receiverName', 'Người nhận', 255], ['phone', 'Điện thoại', 10], ['province', 'Tỉnh / thành phố', 100], ['ward', 'Phường / xã', 100], ['district', 'Quận / huyện (nếu có)', 100], ['addressDetail', 'Số nhà, đường', 500]];
export default function AddressBook() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { let active = true; api.getAddresses().then(data => { if (active) { setRows(data); setLoaded(true); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  async function load() { setBusy(true); setError(''); try { setRows(await api.getAddresses()); setLoaded(true); setForm(null); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const { id, ...payload } = form; await api.saveAddress(id, payload); setRows(await api.getAddresses()); setForm(null); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm('Xóa địa chỉ này? Thông tin giao hàng của đơn cũ vẫn được giữ.')) return;
    setBusy(true); setError('');
    try { await api.deleteAddress(row.id, row.version); setRows(await api.getAddresses()); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="container py-4" style={{ maxWidth: 850 }}>
    <Link to="/tai-khoan">← Tài khoản</Link><h1 className="h4 mt-3">Sổ địa chỉ</h1><p className="text-muted">Dùng chung trên web và mobile. Tối đa 20 địa chỉ.</p>
    {error && <div role="alert" className="alert alert-danger">{error}</div>}
    <div className="d-flex gap-2 mb-3"><button type="button" className="btn btn-primary" disabled={busy || !loaded || rows.length >= 20} onClick={() => setForm({ ...empty })}>Thêm địa chỉ</button><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={load}>Tải lại</button></div>
    {form && <form onSubmit={save} className="bg-white border rounded p-3 mb-3"><fieldset disabled={busy}><h2 className="h6">{form.id ? 'Sửa địa chỉ' : 'Địa chỉ mới'}</h2><div className="row g-3">{fields.map(([name, label, maxLength]) => <label className="col-md-6" key={name}>{label}<input className="form-control mt-1" name={name} type={name === 'phone' ? 'tel' : 'text'} pattern={name === 'phone' ? '0[0-9]{9}' : undefined} required={name !== 'district'} maxLength={maxLength} value={form[name]} onChange={e => setForm(current => ({ ...current, [name]: e.target.value }))} /></label>)}</div>
      <label className="d-block my-3"><input type="checkbox" checked={form.isDefault} disabled={rows.some(row => String(row.id) === String(form.id) && row.is_default)} onChange={e => setForm(current => ({ ...current, isDefault: e.target.checked }))} /> Địa chỉ mặc định</label><button className="btn btn-primary">Lưu địa chỉ</button><button type="button" className="btn btn-link" onClick={() => setForm(null)}>Hủy</button></fieldset></form>}
    {loaded && !rows.length && <p>Chưa có địa chỉ.</p>}
    {rows.map(row => <section key={String(row.id)} className="bg-white border rounded p-3 mb-2"><h2 className="h6">{row.receiver_name} · {row.phone} {row.is_default && <span className="badge text-bg-light">Mặc định</span>}</h2><p>{[row.address_detail, row.ward, row.district, row.province].filter(Boolean).join(', ')}</p><button type="button" className="btn btn-sm btn-outline-secondary me-2" disabled={busy} onClick={() => setForm(draft(row))}>Sửa</button><button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => remove(row)}>Xóa</button></section>)}
  </main>;
}

export function AddressPicker({ onSelect }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.getAddresses().then(data => {
      if (!active) return;
      setRows(data); const first = data.find(row => row.is_default);
      if (first) { setSelected(String(first.id)); onSelect(first, true); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [onSelect]);
  return <div className="mb-3"><label htmlFor="saved-address" className="form-label">Địa chỉ đã lưu</label><select id="saved-address" className="form-select" value={selected} onChange={e => { setSelected(e.target.value); const row = rows.find(row => String(row.id) === e.target.value); if (row) onSelect(row, false); }}><option value="">Nhập địa chỉ khác</option>{rows.map(row => <option key={String(row.id)} value={String(row.id)}>{row.receiver_name} — {row.address_detail}{row.is_default ? ' (mặc định)' : ''}</option>)}</select>{error && <small className="text-danger">{error}</small>}<Link to="/tai-khoan/dia-chi" className="small">Quản lý sổ địa chỉ</Link></div>;
}
