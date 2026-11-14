import { useState } from 'react';
import { useAuth } from '../accounts/authContext';
import { api } from './api';
import { loyaltyError } from '../loyalty/loyaltyUtils';

export default function OnlinePaymentForm({ order }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isMomo = order.payments?.some(p => p.method === 'E_WALLET');
  const provider = isMomo ? 'MoMo sandbox' : 'VNPay';
  if (user?.role !== 'BUYER' || order.payment_status !== 'UNPAID' || !order.payments?.some(p => ['BANK_TRANSFER', 'E_WALLET'].includes(p.method)) || !['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(order.status)) return null;
  async function pay() {
    setBusy(true); setError('');
    try {
      const result = await (isMomo ? api.createMomoPayment(order.id) : api.createVnpayPayment(order.id));
      const url = new URL(result.paymentUrl);
      if (isMomo ? url.origin !== 'https://test-payment.momo.vn' || url.pathname !== '/v2/gateway/pay' : url.protocol !== 'https:' || !['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(url.hostname)) throw new Error('Địa chỉ thanh toán không hợp lệ');
      window.location.assign(url.href);
    } catch (err) { setError(loyaltyError(err)); setBusy(false); }
  }
  return <section className="card p-3 mb-3"><h2 className="h6">Thanh toán trực tuyến</h2><p className="small text-muted">Thanh toán qua {provider}. Trạng thái đơn được cập nhật khi cửa hàng nhận xác nhận từ cổng thanh toán. Nếu vừa thanh toán, hãy tải lại trang sau ít phút.</p>{error && <p className="text-danger" role="alert">{error}</p>}<button className="btn btn-primary align-self-start" disabled={busy} onClick={pay}>{busy ? 'Đang mở cổng thanh toán...' : `Thanh toán qua ${provider}`}</button></section>;
}
