import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../accounts/authContext';
import { api } from '../common/api';
import { PointChart } from '../common/DashboardCharts';
import { formatCurrency, formatDateTime } from '../common/format';
import { LoyaltyFilters, LoyaltyPager, LoyaltyPanel, LoyaltyTable } from './LoyaltyUI';
import { LOYALTY_LABELS as labels, loyaltyError, redemptionKey } from './loyaltyUtils';
import './loyalty.css';

const TABS = { overview: 'Thành viên', transactions: 'Lịch sử điểm', rewards: 'Đổi ưu đãi', redemptions: 'Phiếu ưu đãi đã đổi', complaints: 'Khiếu nại' };

export default function LoyaltyPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [complaint, setComplaint] = useState({ type: 'MISSING_POINTS', orderId: '', message: '' });
  const [filters, setFilters] = useState({});
  const generation = useRef(0);

  const load = useCallback(async (signal) => {
    const request = ++generation.current;
    try {
      const [member, result, chartData] = await Promise.all([
        api.getLoyaltySummary(),
        tab === 'transactions' ? api.getLoyaltyTransactions(page, filters) : tab === 'rewards' ? api.getLoyaltyRewards()
          : tab === 'redemptions' ? api.getLoyaltyRedemptions(page) : tab === 'complaints' ? api.getLoyaltyComplaints(page, filters) : Promise.resolve([]),
        tab === 'overview' ? api.getLoyaltyCharts() : Promise.resolve(null),
      ]);
      if (request !== generation.current || signal?.aborted) return;
      setSummary(member); setRows(Array.isArray(result) ? result : result.data); setPagination(result.pagination ?? null); setError('');
      if (chartData) setCharts(chartData);
    } catch (err) { if (request === generation.current && !signal?.aborted) setError(loyaltyError(err)); }
    finally { if (request === generation.current && !signal?.aborted) setLoading(false); }
  }, [tab, page, filters]);

  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load, user.id]);

  async function mutate(action, message) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); await load(); }
    catch (err) { setError(loyaltyError(err)); }
    finally { setBusy(false); }
  }

  const member = summary?.member;
  const config = summary?.rule?.config;
  const progress = member?.nextTier ? Math.min(100, 100 * Number(member.qualifying_spend) / member.nextTier.minimumSpend) : 100;

  return <div className="container py-4 loyalty-page" style={{ maxWidth: 1120 }}>
    <div className="d-flex flex-wrap align-items-center gap-3 mb-3"><div><h1 className="h4 fw-bold mb-1">Khách hàng thân thiết</h1><p className="text-muted mb-0">Mỗi lần mua sắm, thêm một quyền lợi dành cho bạn.</p></div><button className="btn btn-outline-secondary btn-sm ms-auto" disabled={busy || loading} onClick={() => { setLoading(true); void load(); }}>Làm mới</button></div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {notice && <div className="alert alert-success" role="status">{notice}</div>}
    <nav className="nav nav-pills flex-wrap gap-2 mb-4" aria-label="Khách hàng thân thiết">{Object.entries(TABS).map(([key, text]) => <button key={key} className={`nav-link ${tab === key ? 'active' : ''}`} aria-current={tab === key ? 'page' : undefined} disabled={busy} onClick={() => { if (tab === key) return; setLoading(true); setTab(key); setPage(1); setFilters({}); setNotice(''); }}>{text}</button>)}</nav>
    {['transactions', 'complaints'].includes(tab) && <LoyaltyFilters key={tab} transactions={tab === 'transactions'} statuses={tab === 'complaints' ? ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map((status) => [status, labels[status]]) : []} onApply={(value) => { setFilters(value); setPage(1); setLoading(true); }} />}
    {loading ? <p role="status" className="text-muted py-4">Đang tải chương trình thành viên...</p> : <>
      {!member && <LoyaltyPanel title="Tham gia chương trình">
        <p>Nhận điểm cho đơn hàng phát sinh sau khi tham gia, hoàn tất và đã xác nhận thanh toán. Điểm được tính trên giá trị hàng hóa sau giảm giá, không gồm phí vận chuyển.</p>
        {config && <p>Mỗi {formatCurrency(config.spendPerPoint)} nhận điểm theo hệ số hạng; điểm có hạn dùng {config.expiryDays} ngày.</p>}
        <button className="btn btn-primary" disabled={busy} onClick={() => mutate(() => api.enrollLoyalty(), 'Bạn đã tham gia chương trình thành viên.')}>Tham gia miễn phí</button>
      </LoyaltyPanel>}
      {tab === 'overview' && config && <>
        {member && <><div className="row g-3 mb-3">
          {[['Hạng hiện tại', member.tier.name], ['Điểm khả dụng', member.availablePoints.toLocaleString('vi-VN')], ['Chi tiêu xét hạng', formatCurrency(member.qualifying_spend)]].map(([label, value]) => <div className="col-md-4" key={label}><div className="bg-white border rounded-3 p-4 h-100"><p className="text-muted small mb-2">{label}</p><strong className="h4">{value}</strong></div></div>)}
        </div>
          {member.pointsDebt > 0 && <div className="alert alert-warning">Bạn có {member.pointsDebt} điểm cần bù do thu hồi điểm từ đơn hoàn/hủy. Điểm phát sinh tiếp theo sẽ bù khoản này trước khi dùng đổi thưởng.</div>}
          <PointChart charts={charts} />
          <LoyaltyPanel title="Hành trình lên hạng">
            <p>{member.nextTier ? `Còn ${formatCurrency(member.nextTier.minimumSpend - Number(member.qualifying_spend))} để đạt hạng ${member.nextTier.name}.` : 'Bạn đã đạt hạng cao nhất của chương trình.'}</p>
            <div className="progress mb-2" role="progressbar" aria-label="Tiến độ lên hạng" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
            <small className="text-muted">Chu kỳ xét hạng kết thúc {formatDateTime(member.cycleEndsAt)}. Đổi điểm không làm giảm chi tiêu xét hạng.</small>
          </LoyaltyPanel>
          <LoyaltyPanel title="Điểm sắp hết hạn">{member.expiringLots.length ? member.expiringLots.map((lot) => <div className="d-flex justify-content-between border-bottom py-2" key={String(lot.id)}><span>{lot.remaining} điểm</span><span>{formatDateTime(lot.expires_at)}</span></div>) : <p className="text-muted mb-0">Không có điểm chờ sử dụng.</p>}</LoyaltyPanel>
        </>}
        <LoyaltyPanel title="Quyền lợi theo hạng"><LoyaltyTable columns={['Hạng', 'Chi tiêu trong chu kỳ', 'Hệ số tích điểm', 'Quyền lợi']}>
          {config.tiers.map((tier) => <tr key={tier.code}><td>{tier.name}</td><td>Từ {formatCurrency(tier.minimumSpend)}</td><td>×{tier.multiplierBps / 10000}</td><td>{tier.benefits || 'Tích điểm theo hệ số hạng'}</td></tr>)}
        </LoyaltyTable><p className="small text-muted mb-0">{summary.rule.name} · Hiệu lực từ {formatDateTime(summary.rule.effectiveAt)} · Chu kỳ {config.tierPeriodDays} ngày. Mỗi lần tích điểm lưu chính sách đã áp dụng.</p></LoyaltyPanel>
      </>}
      {tab === 'transactions' && <LoyaltyPanel title="Lịch sử điểm"><LoyaltyTable columns={['Thời gian', 'Loại', 'Nội dung', 'Điểm', 'Chính sách']} empty={!rows.length}>{rows.map((entry) => <tr key={String(entry.id)}><td>{formatDateTime(entry.created_at)}</td><td>{labels[entry.kind] ?? entry.kind}</td><td>{entry.description}<details><summary>Chi tiết giao dịch</summary><small>Mã: {entry.id} · Giá trị xét hạng: {formatCurrency(entry.qualifying_amount)}{entry.lot && <> · Điểm còn lại: {entry.lot.remaining} · Hết hạn: {formatDateTime(entry.lot.expires_at)}</>}</small></details>{entry.order_id && <> · <Link to={`/don-hang/${entry.order_id}`}>Xem đơn</Link></>}</td><td className={entry.points > 0 ? 'text-success fw-bold' : 'fw-bold'}>{entry.points > 0 ? '+' : ''}{entry.points}</td><td>{entry.rule?.name ?? '—'}</td></tr>)}</LoyaltyTable><LoyaltyPager pagination={pagination} onPage={(value) => { setLoading(true); setPage(value); }} /></LoyaltyPanel>}
      {tab === 'rewards' && <div className="row g-3">{!rows.length && <p className="text-muted">Chương trình chưa mở phần thưởng. Bạn vẫn có thể tích lũy điểm.</p>}{rows.map((reward) => <div className="col-md-6" key={String(reward.id)}><LoyaltyPanel title={reward.name}><p>{reward.description || `Phiếu ưu đãi giảm ${formatCurrency(reward.discount_value)}`}</p><p>Đơn từ {formatCurrency(reward.min_order_value)} · Phiếu ưu đãi có hạn {reward.voucher_days} ngày từ lúc đổi.</p><p className="small text-muted">Chi tiêu xét hạng tối thiểu: {formatCurrency(reward.minimum_tier_spend)} · Còn {reward.stock} phần.</p><div className="d-flex align-items-center justify-content-between"><strong>{reward.points_cost} điểm</strong><button className="btn btn-primary" disabled={busy || !member || member.availablePoints < reward.points_cost || Number(member.qualifying_spend) < Number(reward.minimum_tier_spend) || reward.stock < 1} onClick={() => { if (!window.confirm(`Đổi ${reward.name} với ${reward.points_cost} điểm?`)) return; void mutate(async () => { const attempt = redemptionKey(user.id, reward.id); await api.redeemLoyaltyReward(reward.id, attempt.key); attempt.clear(); }, 'Đổi thưởng thành công. Xem mã tại mục Phiếu ưu đãi đã đổi.'); }}>Đổi ưu đãi</button></div></LoyaltyPanel></div>)}</div>}
      {tab === 'redemptions' && <LoyaltyPanel title="Phiếu ưu đãi đã đổi"><LoyaltyTable columns={['Phần thưởng', 'Mã riêng của bạn', 'Điểm đã dùng', 'Hạn dùng', 'Trạng thái']} empty={!rows.length}>{rows.map((row) => {
        const usable = row.coupon?.status === 'ACTIVE' && row.coupon.used_count === 0 && new Date(row.expires_at) > new Date();
        return <tr key={String(row.id)}><td>{row.reward.name}</td><td><code className="text-break">{row.coupon_code}</code>{usable && <Link className="d-block mt-1" to={`/thanh-toan?coupon=${encodeURIComponent(row.coupon_code)}`}>Dùng khi thanh toán</Link>}</td><td>{row.points_spent}</td><td>{formatDateTime(row.expires_at)}</td><td>{row.coupon?.used_count > 0 ? 'Đã sử dụng' : usable ? 'Có thể sử dụng' : 'Hết hiệu lực'}</td></tr>;
      })}</LoyaltyTable><LoyaltyPager pagination={pagination} onPage={(value) => { setLoading(true); setPage(value); }} /></LoyaltyPanel>}
      {tab === 'complaints' && <>
        {member && <LoyaltyPanel title="Gửi khiếu nại"><form onSubmit={(event) => { event.preventDefault(); void mutate(async () => { await api.createLoyaltyComplaint({ type: complaint.type, message: complaint.message, ...(complaint.orderId.trim() ? { orderId: complaint.orderId.trim() } : {}) }); setComplaint((prev) => ({ ...prev, message: '', orderId: '' })); }, 'Đã tiếp nhận khiếu nại của bạn.'); }} className="row g-3">
          <label className="col-md-6">Vấn đề<select className="form-select mt-1" value={complaint.type} onChange={(event) => setComplaint({ ...complaint, type: event.target.value })}>{['MISSING_POINTS', 'WRONG_POINTS', 'TIER', 'REDEMPTION', 'OTHER'].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
          <label className="col-md-6">Mã đơn hàng liên quan (nếu có)<input className="form-control mt-1" inputMode="numeric" pattern="[1-9][0-9]{0,17}" value={complaint.orderId} onChange={(event) => setComplaint({ ...complaint, orderId: event.target.value })} /></label>
          <label className="col-12">Nội dung<textarea className="form-control mt-1" required minLength={10} maxLength={2000} rows={3} value={complaint.message} onChange={(event) => setComplaint({ ...complaint, message: event.target.value })} /></label>
          <div><button className="btn btn-primary" disabled={busy}>Gửi khiếu nại</button></div>
        </form></LoyaltyPanel>}
        <LoyaltyPanel title="Theo dõi khiếu nại">{!rows.length && <p className="text-muted">Chưa có khiếu nại.</p>}{rows.map((row) => <article key={String(row.id)} className="border-bottom py-3"><div className="d-flex justify-content-between gap-2"><strong>#{row.id} · {labels[row.type]}</strong><span>{labels[row.status]}</span></div><small className="text-muted">{formatDateTime(row.created_at)}</small><p className="mt-2 mb-1" style={{ whiteSpace: 'pre-wrap' }}>{row.message}</p>{row.response && <p className="text-primary mb-0">Phản hồi: {row.response}</p>}</article>)}<LoyaltyPager pagination={pagination} onPage={(value) => { setLoading(true); setPage(value); }} /></LoyaltyPanel>
      </>}
    </>}
  </div>;
}
