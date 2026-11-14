import { useEffect, useState } from 'react';
import { api } from '../common/api';
export default function AdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { let active = true; api.getSettings().then(data => { if (active) setForm(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  async function reload() {
    setBusy(true); setError(''); setSaved(false);
    try { setForm(await api.getSettings()); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      await api.saveSettings({ storeName: form.storeName.trim(), supportEmail: form.supportEmail.trim(), supportPhone: form.supportPhone.trim(), storeAddress: form.storeAddress.trim(), shippingFee: Number(form.shippingFee), freeShippingThreshold: Number(form.freeShippingThreshold), expectedVersion: form.version });
      setForm(await api.getSettings()); setSaved(true);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const fields = [['storeName', 'Tên cửa hàng', 'text', 150], ['supportEmail', 'Thư điện tử hỗ trợ', 'email', 255], ['supportPhone', 'Điện thoại hỗ trợ', 'tel', 20], ['storeAddress', 'Địa chỉ cửa hàng', 'text', 500], ['shippingFee', 'Phí giao hàng mỗi cửa hàng (đ)', 'number', 10000000], ['freeShippingThreshold', 'Miễn phí giao hàng từ (đ / cửa hàng)', 'number', 1000000000]];
  return <div style={{ maxWidth: 800 }}><h1 className="h4">Cài đặt hệ thống</h1><p className="text-muted">Thông tin hiển thị trên web và mobile. Phí vận chuyển áp dụng cho báo giá và đơn hàng mới.</p>
    {error && <div role="alert" className="alert alert-danger">{error}</div>}{saved && <div role="status" className="alert alert-success">Đã lưu cài đặt.</div>}
    {form && <form onSubmit={save} className="admin-surface p-4"><fieldset disabled={busy}><div className="row g-3">{fields.map(([name, label, type, max]) => <label key={name} className="col-md-6">{label}<input name={name} className="form-control mt-1" type={type} required={type === 'number' || name === 'storeName'} min={type === 'number' ? 0 : undefined} max={type === 'number' ? max : undefined} maxLength={type !== 'number' ? max : undefined} step={type === 'number' ? 1 : undefined} value={form[name]} onChange={e => setForm(current => ({ ...current, [name]: e.target.value }))} /></label>)}</div><button className="btn btn-primary mt-4">{busy ? 'Đang lưu…' : 'Lưu cài đặt'}</button></fieldset></form>}
    <button type="button" className="btn btn-link mt-2" disabled={busy} onClick={reload}>Tải lại từ máy chủ</button>
  </div>;
}
