import { valueLabel, formatCurrency, formatDate } from '../common/format';
import { AdminTable } from './AdminTable';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../common/api';

const DISCOUNT_LABELS = {
  PERCENT: 'Giảm %',
  FIXED: 'Giảm tiền',
  FREE_SHIP: 'Miễn phí vận chuyển',
};

function describeDiscount(coupon) {
  if (coupon.discountType === 'FREE_SHIP') return 'Miễn phí vận chuyển';
  if (coupon.discountType === 'PERCENT') {
    return `Giảm ${coupon.discountValue}%${
      coupon.maxDiscount ? ` (tối đa ${formatCurrency(coupon.maxDiscount)})` : ''
    }`;
  }
  return `Giảm ${formatCurrency(coupon.discountValue)}`;
}

function localDate(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Quản lý mã giảm giá (coupons) — dữ liệu thật từ bảng coupons. */
export default function AdminCouponsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setLoading(true); setRevision(value => value + 1); }, []);
  useEffect(() => {
    let active = true;
    api.getCoupons().then(data => { if (active) { setRows(data); setError(''); } })
      .catch(err => { if (active) setError(err.message || 'Không tải được mã giảm giá.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  function edit(coupon) {
    setEditor({ ...coupon, startAt: localDate(coupon.startAt), endAt: localDate(coupon.endAt), maxDiscount: coupon.maxDiscount ?? '', usageLimit: coupon.usageLimit ?? '' });
    setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function create() {
    const now = new Date();
    setEditor({ code: '', name: '', discountType: 'FIXED', discountValue: '', minOrderValue: 0, maxDiscount: '', usageLimit: '', usedCount: 0, startAt: localDate(now), endAt: localDate(new Date(now.getTime() + 30 * 86400000)), status: 'ACTIVE' });
    setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (new Date(editor.endAt) <= new Date(editor.startAt)) { setError('Ngày kết thúc phải sau ngày bắt đầu.'); return; }
    if (editor.usageLimit !== '' && Number(editor.usageLimit) < editor.usedCount) { setError('Giới hạn sử dụng không được nhỏ hơn số lượt đã dùng.'); return; }
    setBusy(true);
    try {
      const data = {
        name: editor.name.trim(), discountType: editor.discountType,
        discountValue: editor.discountType === 'FREE_SHIP' ? 0 : Number(editor.discountValue),
        minOrderValue: Number(editor.minOrderValue), maxDiscount: editor.maxDiscount === '' ? null : Number(editor.maxDiscount),
        usageLimit: editor.usageLimit === '' ? null : Number(editor.usageLimit),
        startAt: new Date(editor.startAt).toISOString(), endAt: new Date(editor.endAt).toISOString(),
        status: editor.status,
      };
      if (editor.id) await api.updateCoupon(editor.id, { ...data, expectedVersion: editor.version });
      else await api.createCoupon({ ...data, code: editor.code.trim().toUpperCase() });
      setEditor(null); setNotice(editor.id ? 'Đã cập nhật mã giảm giá.' : 'Đã tạo mã giảm giá.'); refresh();
    } catch (err) { setError(err.message || 'Không cập nhật được mã giảm giá.'); }
    finally { setBusy(false); }
  }
  const change = event => setEditor(value => ({ ...value, [event.target.name]: event.target.value }));

  return (
    <>
    {notice && <div className="alert alert-success" role="status">{notice}</div>}
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {editor && <section className="admin-surface p-3 mb-4" aria-labelledby="coupon-editor-title">
      <h2 className="h5" id="coupon-editor-title">{editor.id ? `Chỉnh sửa mã ${editor.code}` : 'Thêm mã giảm giá'}</h2>
      <p className="small text-muted">{editor.id ? 'Mã định danh và số lượt đã dùng được giữ nguyên. Thay đổi áp dụng cho các lượt sử dụng tiếp theo.' : 'Mã giảm giá dùng chung cho khách hàng đáp ứng điều kiện. Phiếu đổi bằng điểm được quản lý tại phần thưởng KHTT.'}</p>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="row g-3">
            {!editor.id && <label className="col-12">Mã giảm giá<input className="form-control" name="code" required maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,49}" placeholder="Ví dụ: CHAOBAN20" autoCapitalize="characters" spellCheck={false} value={editor.code} onChange={change} /><small className="text-muted">Dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới. Mã được lưu bằng chữ in hoa.</small></label>}
            <label className="col-12">Tên chương trình<input className="form-control" name="name" required maxLength={255} value={editor.name} onChange={change} /></label>
            <label className="col-md-6">Loại giảm giá<select className="form-select" name="discountType" value={editor.discountType} onChange={change}>{Object.entries(DISCOUNT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="col-md-6">{editor.discountType === 'PERCENT' ? 'Mức giảm (%)' : 'Số tiền giảm (đ)'}<input className="form-control" name="discountValue" type="number" required disabled={editor.discountType === 'FREE_SHIP'} min={editor.discountType === 'FREE_SHIP' ? 0 : 0.01} max={editor.discountType === 'PERCENT' ? 100 : 999999999999} step="0.01" value={editor.discountType === 'FREE_SHIP' ? 0 : editor.discountValue} onChange={change} /></label>
            <label className="col-md-6">Đơn hàng tối thiểu (đ)<input className="form-control" name="minOrderValue" type="number" required min="0" max="999999999999" step="0.01" value={editor.minOrderValue} onChange={change} /></label>
            <label className="col-md-6">Giảm tối đa (đ)<input className="form-control" name="maxDiscount" type="number" min="0.01" max="999999999999" step="0.01" placeholder="Để trống nếu không giới hạn" value={editor.maxDiscount} onChange={change} /></label>
            <label className="col-md-6">Bắt đầu<input className="form-control" name="startAt" type="datetime-local" required value={editor.startAt} onChange={change} /></label>
            <label className="col-md-6">Kết thúc<input className="form-control" name="endAt" type="datetime-local" required value={editor.endAt} onChange={change} /></label>
            <label className="col-md-6">Giới hạn lượt dùng<input className="form-control" name="usageLimit" type="number" min={Math.max(1, editor.usedCount)} max="2147483647" step="1" placeholder="Để trống nếu không giới hạn" value={editor.usageLimit} onChange={change} /><small className="text-muted">Đã sử dụng {editor.usedCount} lượt</small></label>
            <label className="col-md-6">Trạng thái<select className="form-select" name="status" value={editor.status} onChange={change}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Tạm dừng</option><option value="EXPIRED">Hết hạn</option></select></label>
          </div>
          <div className="d-flex gap-2 mt-3"><button className="btn btn-primary" type="submit">{busy ? 'Đang lưu…' : editor.id ? 'Lưu thay đổi' : 'Tạo mã giảm giá'}</button><button className="btn btn-outline-secondary" type="button" onClick={() => setEditor(null)}>Hủy</button></div>
        </fieldset>
      </form>
    </section>}
    <AdminTable
      title="Quản lý Mã giảm giá"
      columns={['Mã', 'Tên', 'Giảm giá', 'Đơn tối thiểu', 'Dùng', 'Hạn', 'Trạng thái', 'Thao tác']}
      rows={rows}
      loading={loading}
      toolbar={<div className="d-flex justify-content-end gap-2 mb-3"><button className="btn btn-sm btn-outline-secondary" disabled={busy || loading} onClick={refresh}>Tải lại danh sách</button><button className="btn btn-sm btn-primary" disabled={busy} onClick={create}>+ Thêm mã giảm giá</button></div>}
      emptyText="Chưa có mã giảm giá nào trong hệ thống"
      renderRow={(coupon) => (
        <tr key={String(coupon.id)}>
          <td className="fw-semibold" style={{ color: '#ee4d2d' }}>{coupon.code}</td>
          <td>{coupon.name}</td>
          <td>
            {describeDiscount(coupon)}
            <small className="text-muted d-block">
              {DISCOUNT_LABELS[coupon.discountType] ?? coupon.discountType}
            </small>
          </td>
          <td>{formatCurrency(coupon.minOrderValue)}</td>
          <td>
            {coupon.usedCount}
            {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
          </td>
          <td>{formatDate(coupon.endAt)}</td>
          <td>
            {coupon.status === 'ACTIVE' ? (
              <span className="badge text-bg-success">Đang hoạt động</span>
            ) : (
              <span className="badge text-bg-secondary">{valueLabel(coupon.status)}</span>
            )}
          </td>
          <td><button className="btn btn-sm btn-outline-primary" disabled={busy || loading} onClick={() => edit(coupon)}>Chỉnh sửa</button></td>
        </tr>
      )}
    />
    </>
  );
}
