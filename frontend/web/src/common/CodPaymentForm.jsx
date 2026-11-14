import { useState } from 'react';
import { useAuth } from '../accounts/authContext';
import { api } from './api';
import { loyaltyError } from '../loyalty/loyaltyUtils';

export default function CodPaymentForm({ order, onConfirmed }) {
  const { user } = useAuth();
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!['ADMIN', 'SELLER'].includes(user?.role) || !['DELIVERED', 'COMPLETED'].includes(order.status) || order.payment_status === 'PAID' || order.payments?.length !== 1 || order.payments[0].method !== 'COD') return null;
  return <form className="bg-white border rounded-3 p-3 mb-3" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.confirmCodPayment(order.id, reference); onConfirmed(); }
    catch (err) { setError(loyaltyError(err)); }
    finally { setBusy(false); }
  }}>
    <h2 className="h6 fw-bold">Xác nhận thu tiền COD</h2><p className="small text-muted">Chỉ xác nhận sau khi đã đối chiếu khoản tiền thu hộ. Đơn hoàn tất và đã thu tiền mới đủ điều kiện tích điểm.</p>
    {error && <p className="text-danger" role="alert">{error}</p>}
    <label className="d-block">Mã đối soát hoặc chứng từ<input className="form-control my-2" required minLength={5} maxLength={100} value={reference} onChange={(event) => setReference(event.target.value)} /></label>
    <button className="btn btn-sm btn-outline-primary" disabled={busy}>{busy ? 'Đang xác nhận...' : 'Xác nhận đã thu đủ tiền'}</button>
  </form>;
}
