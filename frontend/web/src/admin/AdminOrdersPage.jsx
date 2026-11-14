import { valueLabel, formatCurrency, formatDateTime } from '../common/format';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminTable } from './AdminTable';
import { AdminFilters } from './AdminEditor';
import { useAdminList } from './adminData';
import { LoyaltyPager } from '../loyalty/LoyaltyUI';
import { api } from '../common/api';

const labels = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang chuẩn bị', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', RETURNED: 'Đã trả', FAILED: 'Giao thất bại', NON_RECEIVED: 'Không nhận hàng' };
const transitions = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['SHIPPING', 'CANCELLED'], SHIPPING: ['DELIVERED', 'FAILED', 'NON_RECEIVED'], DELIVERED: ['COMPLETED', 'RETURNED'], COMPLETED: ['RETURNED'] };
export default function AdminOrdersPage() {
  const list = useAdminList(api.getAdminOrders);
  const [order, setOrder] = useState(null);
  const [target, setTarget] = useState('');
  const [reference, setReference] = useState('');
  const [received, setReceived] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function open(id) {
    setBusy(true); setError(''); setNotice('');
    try { const current = await api.getOrderById(id); setOrder(current); setTarget(''); setReference(''); setReceived(false); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function update(event) {
    event.preventDefault(); if (!target || busy) return;
    setBusy(true); setError('');
    try { await api.updateOrderStatus(order.id, target, order.status); const current = await api.getOrderById(order.id); setOrder(current); setTarget(''); list.refresh(); setNotice('Đã cập nhật đơn hàng và thông báo khách hàng.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function confirmPayment(event) {
    event.preventDefault(); if (!received || busy) return;
    setBusy(true); setError('');
    try { await api.confirmCodPayment(order.id, reference.trim()); setOrder(await api.getOrderById(order.id)); list.refresh(); setNotice('Đã xác nhận thu COD.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const canConfirmCod = order && ['DELIVERED', 'COMPLETED'].includes(order.status) && order.payment_status === 'UNPAID' && order.payments?.length === 1 && order.payments[0].method === 'COD';
  return <>
    {notice && <div role="status" className="alert alert-success">{notice}</div>}
    {error && <div role="alert" className="alert alert-danger">{error}</div>}
    {order && <section className="admin-surface p-3 mb-4" aria-label="Chi tiết đơn hàng">
      <div className="d-flex justify-content-between"><h2 className="h5">{order.order_code}</h2><button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setOrder(null)}>Đóng</button></div>
      <p>{order.shipping_receiver_name} · {order.shipping_phone}<br />{order.shipping_address_detail}</p>
      <p>{labels[order.status]} · {valueLabel(order.payment_status)} · {formatCurrency(Number(order.total_amount))}</p>
      <ul>{order.order_items?.map(item => <li key={String(item.id)}>{item.product_name} × {item.quantity} — {formatCurrency(Number(item.unit_price))}</li>)}</ul>
      {(transitions[order.status] ?? []).length > 0 && <form onSubmit={update} className="d-flex flex-wrap align-items-center gap-2 border-top pt-3">
        <label>Chuyển trạng thái<select aria-label="Trạng thái mới" className="form-select" required disabled={busy} value={target} onChange={e => setTarget(e.target.value)}><option value="">Chọn thao tác</option>{transitions[order.status].map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
        <button className="btn btn-primary align-self-end" disabled={busy || !target}>Xác nhận cập nhật</button>
        {target === 'RETURNED' && <small className="text-muted">Chỉ xác nhận khi đã nhận lại hàng; thao tác này không xác nhận hoàn tiền.</small>}
        {target === 'CANCELLED' && <small className="text-muted">Hủy đơn sẽ trả lại lượng hàng đã giữ trong kho.</small>}
        {target === 'CANCELLED' && order.payment_status === 'PAID' && <small className="text-danger">Đơn đã thanh toán: hủy đơn không tự hoàn tiền, cần đối soát khoản thu.</small>}
      </form>}
      {canConfirmCod && <form onSubmit={confirmPayment} className="border-top mt-3 pt-3">
        <h3 className="h6">Xác nhận tiền thu hộ COD</h3>
        <input className="form-control mb-2" aria-label="Mã biên nhận COD" minLength={5} maxLength={500} required placeholder="Mã biên nhận / đối soát" value={reference} onChange={e => setReference(e.target.value)} disabled={busy} />
        <label className="d-block mb-2"><input type="checkbox" checked={received} onChange={e => setReceived(e.target.checked)} disabled={busy} /> Đã kiểm tra và nhận đủ tiền</label>
        <button className="btn btn-outline-primary" disabled={busy || !received}>Xác nhận đã thu tiền</button>
      </form>}
      <h3 className="h6 mt-3">Lịch sử xử lý</h3>
      <ul>{order.order_status_history?.map(row => <li key={String(row.id)}>{labels[row.old_status] ?? 'Tạo đơn'} → {labels[row.new_status]} · {formatDateTime(row.created_at)}</li>)}</ul>
      <button type="button" className="btn btn-link" disabled={busy} onClick={() => open(order.id)}>Tải lại chi tiết</button>
    </section>}
    <AdminTable title="Quản trị đơn hàng" rows={list.rows} loading={list.loading} error={list.error} columns={['Mã đơn', 'Người nhận', 'Tổng tiền', 'Trạng thái', 'Thanh toán', 'Ngày đặt', 'Thao tác']}
      toolbar={<AdminFilters loading={list.loading} onRefresh={list.refresh} onSearch={filters => list.search({ ...filters, paymentStatus: paymentFilter })} placeholder="Mã đơn, tên, điện thoại, thư điện tử..." statuses={Object.entries(labels)}>
        <select aria-label="Lọc thanh toán" className="form-select" value={paymentFilter} onChange={e => { setPaymentFilter(e.target.value); list.search({ q: list.query.q, status: list.query.status, paymentStatus: e.target.value }); }}><option value="">Tất cả thanh toán</option><option value="UNPAID">Chưa thanh toán</option><option value="PAID">Đã thanh toán</option><option value="REFUNDED">Đã hoàn tiền</option></select>
      </AdminFilters>}
      renderRow={row => <tr key={String(row.id)}><td><Link to={`/don-hang/${row.id}`}>{row.order_code}</Link></td><td>{row.shipping_receiver_name}<small className="d-block text-muted">{row.shipping_phone}</small></td><td>{formatCurrency(Number(row.total_amount))}</td><td>{labels[row.status] ?? row.status}</td><td>{valueLabel(row.payment_status)}</td><td>{formatDateTime(row.created_at)}</td><td><button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => open(row.id)}>Xử lý</button></td></tr>} />
    <LoyaltyPager pagination={list.pagination} onPage={list.changePage} />
  </>;
}
