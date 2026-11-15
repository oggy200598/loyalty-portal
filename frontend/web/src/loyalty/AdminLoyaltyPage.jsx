import { valueLabel, formatCurrency, formatDateTime } from '../common/format';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../accounts/authContext';
import { api } from '../common/api';
import { PointChart, DistributionChart } from '../common/DashboardCharts';
import { LoyaltyFilters, LoyaltyMemberPicker, LoyaltyPager, LoyaltyPanel, LoyaltyTable } from './LoyaltyUI';
import LoyaltyAuditHistory from './LoyaltyAuditHistory';
import { adjustmentKey, DEFAULT_RULE_FORM, LOYALTY_LABELS as labels, loyaltyError } from './loyaltyUtils';

const TABS = { overview: 'Tổng quan', members: 'Thành viên', rules: 'Chính sách & hạng', rewards: 'Phần thưởng', complaints: 'Khiếu nại', adjustments: 'Điều chỉnh điểm', audit: 'Nhật ký' };
const NEW_REWARD = { name: '', description: '', pointsCost: 100, discountValue: 20000, minOrderValue: 100000, stock: 100, minimumTierSpend: 0, voucherDays: 30 };

export default function AdminLoyaltyPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [auditActors, setAuditActors] = useState([]);
  const [auditUsers, setAuditUsers] = useState({});
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rule, setRule] = useState({ name: '', config: structuredClone(DEFAULT_RULE_FORM) });
  const [reward, setReward] = useState({ ...NEW_REWARD });
  const [adjustment, setAdjustment] = useState({ memberId: '', complaintId: '', points: 0, reason: '' });
  const [notes, setNotes] = useState({});
  const [dates, setDates] = useState({});
  const [filters, setFilters] = useState({});
  const [ruleEditor, setRuleEditor] = useState(null);
  const [ruleDate, setRuleDate] = useState('');
  const [rewardEditor, setRewardEditor] = useState(null);
  const [rewardError, setRewardError] = useState('');
  const rewardFormRef = useRef(null);
  const [applyImmediately, setApplyImmediately] = useState(true);
  const [detail, setDetail] = useState(null);
  const detailGeneration = useRef(0);
  const generation = useRef(0);

  const load = useCallback(async (signal) => {
    const request = ++generation.current;
    try {
      const result = await api.getAdminLoyalty(tab, page, filters);
      if (request !== generation.current || signal?.aborted) return;
      if (tab === 'overview') { setOverview(result); setRows([]); }
      else setRows(Array.isArray(result) ? result : result.data);
      if (tab === 'audit') { setAuditActors(result.actors ?? []); setAuditUsers(result.relatedUsers ?? {}); }
      setPagination(result.pagination ?? null); setError('');
    } catch (err) { if (request === generation.current && !signal?.aborted) setError(loyaltyError(err)); }
    finally { if (request === generation.current && !signal?.aborted) setLoading(false); }
  }, [tab, page, filters]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return load(controller.signal); }); return () => controller.abort(); }, [load, user.id]);

  async function mutate(action, message) {
    if (busy) return;
    setBusy(true); setNotice(''); setError('');
    try { await action(); setNotice(message); await load(); }
    catch (err) { setError(loyaltyError(err)); }
    finally { setBusy(false); }
  }
  function switchTab(next) { if (next === tab) return; detailGeneration.current++; setDetail(null); setRows([]); setPagination(null); setFilters({}); setLoading(true); setError(''); setTab(next); setPage(1); setNotice(''); }
  function requestAdjustment(memberId, complaintId = '', memberLabel = '') { setAdjustment({ memberId, memberLabel: memberLabel || (complaintId ? `Thành viên từ khiếu nại #${complaintId}` : ''), complaintId: String(complaintId), points: 0, reason: '' }); switchTab('adjustments'); }
  function noteFor(key) {
    const value = notes[key]?.trim();
    if (!value) throw new Error('Vui lòng nhập phản hồi hoặc lý do quyết định');
    return value;
  }
  function changeConfig(key, value) { setRule((previous) => ({ ...previous, config: { ...previous.config, [key]: Number(value) } })); }
  function changeTier(index, key, value) { setRule((previous) => ({ ...previous, config: { ...previous.config, tiers: previous.config.tiers.map((tier, row) => row === index ? { ...tier, [key]: ['minimumSpend', 'multiplierBps'].includes(key) ? Number(value) : value } : tier) } })); }
  async function showMember(member, memberPage = 1, memberFilters = {}) {
    const request = ++detailGeneration.current;
    try {
      const [summary, transactions] = await Promise.all([api.getAdminLoyaltyMember(member.user_id), api.getAdminLoyaltyMemberTransactions(member.user_id, memberPage, memberFilters)]);
      if (request === detailGeneration.current) setDetail({ member, summary, transactions, filters: memberFilters });
    } catch (err) { if (request === detailGeneration.current) setError(loyaltyError(err)); }
  }
  async function saveRule(event) {
    event.preventDefault();
    const status = event.nativeEvent.submitter?.value || 'DRAFT';
    if (status === 'PUBLISHED' && !window.confirm(ruleDate ? 'Công bố chính sách theo lịch đã chọn?' : 'Áp dụng chính sách này ngay? Giao dịch cũ giữ nguyên quy tắc đã dùng.')) return;
    await mutate(async () => {
      const effectiveAt = ruleDate ? new Date(ruleDate).toISOString() : new Date().toISOString();
      if (ruleEditor) {
        const saved = await api.updateLoyaltyRule(ruleEditor.id, { ...rule, expectedVersion: ruleEditor.version });
        setRuleEditor({ id: saved.id, version: saved.version });
        if (status === 'PUBLISHED') await api.publishLoyaltyRule(saved.id, effectiveAt, saved.version);
      } else await api.createLoyaltyRule({ ...rule, status, ...(status === 'PUBLISHED' ? { effectiveAt } : {}) });
      setRuleEditor(null); setRuleDate(''); setRule({ name: '', config: structuredClone(DEFAULT_RULE_FORM) });
    }, status === 'DRAFT' ? 'Đã lưu bản nháp trong hệ thống.' : 'Đã công bố chính sách theo thời điểm hiệu lực.');
  }
  useEffect(() => {
    if (!rewardEditor || tab !== 'rewards') return;
    rewardFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    rewardFormRef.current?.querySelector('input')?.focus({ preventScroll: true });
  }, [rewardEditor, tab]);

  async function editReward(id) {
    if (busy) return;
    setBusy(true); setRewardError(''); setError(''); setNotice('');
    try {
      const row = await api.getAdminLoyaltyReward(id);
      setReward({ name: row.name, description: row.description ?? '', pointsCost: Number(row.points_cost), discountValue: Number(row.discount_value), minOrderValue: Number(row.min_order_value), stock: Number(row.stock), minimumTierSpend: Number(row.minimum_tier_spend), voucherDays: Number(row.voucher_days) });
      setRewardEditor({ id: row.id, version: row.version });
    } catch (err) { setError(loyaltyError(err)); }
    finally { setBusy(false); }
  }

  async function saveReward(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setRewardError(''); setNotice(''); setError('');
    try {
      if (rewardEditor) await api.updateLoyaltyReward(rewardEditor.id, { ...reward, expectedVersion: rewardEditor.version });
      else await api.createLoyaltyReward(reward);
      setRewardEditor(null); setReward({ ...NEW_REWARD });
      setNotice('Đã lưu phần thưởng. Các phiếu đã cấp giữ nguyên điều kiện cũ.');
      await load();
    } catch (err) { setRewardError(loyaltyError(err)); }
    finally { setBusy(false); }
  }
  async function saveAdjustment(event) {
    event.preventDefault();
    if (busy) return;
    if (!adjustment.memberId) { setError('Chọn thành viên trong kết quả tìm kiếm trước khi điều chỉnh điểm.'); return; }
    if (!window.confirm(applyImmediately ? 'Xác nhận cập nhật điểm ngay cho thành viên này?' : 'Lưu yêu cầu điều chỉnh để xử lý sau?')) return;
    const payload = { memberId: adjustment.memberId, points: Number(adjustment.points), reason: adjustment.reason.trim(), applyImmediately, ...(adjustment.complaintId ? { complaintId: adjustment.complaintId } : {}) };
    await mutate(async () => {
      const attempt = await adjustmentKey(user.id, payload);
      await api.createLoyaltyAdjustment({ ...payload, idempotencyKey: attempt.key });
      attempt.clear();
      setAdjustment({ memberId: '', complaintId: '', points: 0, reason: '' });
    }, applyImmediately ? 'Đã áp dụng điều chỉnh và ghi nhật ký.' : 'Đã lưu yêu cầu chờ duyệt.');
  }

  return <div>
    <div className="admin-page-heading"><div><h1>Khách hàng thân thiết</h1><p>Theo dõi thành viên, điểm thưởng và quyền lợi.</p></div><button className="btn btn-outline-secondary btn-sm ms-auto" disabled={busy || loading} onClick={() => { setLoading(true); void load(); }}>Làm mới</button></div>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}{notice && <div className="alert alert-success" role="status">{notice}</div>}
    <nav className="admin-tabs nav nav-pills flex-wrap gap-2 mb-4" aria-label="Quản trị Khách hàng thân thiết">{Object.entries(TABS).map(([key, name]) => <button key={key} className={`nav-link ${tab === key ? 'active' : ''}`} aria-pressed={tab === key} disabled={busy} onClick={() => switchTab(key)}>{name}</button>)}</nav>
    {!['rules', 'overview'].includes(tab) && <LoyaltyFilters key={tab} members={tab === 'members'} dates={['complaints', 'adjustments', 'audit'].includes(tab)} audit={tab === 'audit'} actors={auditActors} statuses={tab === 'members' ? [['ACTIVE', 'Hoạt động'], ['SUSPENDED', 'Đã khóa'], ['DELETED', 'Đã xóa']] : tab === 'rewards' ? [['ACTIVE', 'Đang mở'], ['INACTIVE', 'Tạm dừng']] : tab === 'complaints' ? ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map((status) => [status, labels[status]]) : tab === 'adjustments' ? ['PENDING', 'APPROVED', 'REJECTED'].map((status) => [status, labels[status]]) : []} onApply={(value) => { setFilters(value); setPage(1); setLoading(true); }} />}
    {detail && <LoyaltyPanel title={`Chi tiết thành viên: ${detail.member.users.full_name || detail.member.users.email}`}><button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => { detailGeneration.current++; setDetail(null); }}>Đóng chi tiết</button><p>Điểm khả dụng: {detail.summary.member?.availablePoints} · Hạng: {detail.summary.member?.tier.name} · Chi tiêu: {formatCurrency(detail.summary.member?.qualifying_spend)}</p><LoyaltyFilters transactions onApply={(value) => showMember(detail.member, 1, value)} /><LoyaltyTable columns={['Thời gian', 'Loại', 'Nội dung', 'Điểm']} empty={!detail.transactions.data.length}>{detail.transactions.data.map((entry) => <tr key={String(entry.id)}><td>{formatDateTime(entry.created_at)}</td><td>{labels[entry.kind]}</td><td>{entry.description}</td><td>{entry.points}</td></tr>)}</LoyaltyTable><LoyaltyPager pagination={detail.transactions.pagination} onPage={(value) => showMember(detail.member, value, detail.filters)} /></LoyaltyPanel>}
    {loading ? <p role="status">Đang tải dữ liệu...</p> : <>
      {tab === 'overview' && !error && overview && <>
        <div className="admin-metrics"><div className="admin-metric"><span>Thành viên</span><strong>{Number(overview?.totalMembers ?? 0).toLocaleString('vi-VN')}</strong><small>Không gồm tài khoản đã xóa</small></div><div className="admin-metric"><span>Lượt đổi thưởng</span><strong>{Number(overview?.totalRedemptions ?? 0).toLocaleString('vi-VN')}</strong><small>Toàn thời gian · thành viên chưa xóa</small></div></div>
        <PointChart charts={overview} />
        <div className="dashboard-charts admin-chart-grid"><DistributionChart title="Phân bố hạng thành viên" rows={overview?.tiers} unit="thành viên" /><DistributionChart title="Trạng thái khiếu nại" rows={overview?.complaints} unit="khiếu nại" /></div>
      </>}
      {tab === 'members' && <LoyaltyPanel title="Danh sách thành viên"><LoyaltyTable columns={['Khách hàng', 'Điện thoại', 'Trạng thái tài khoản', 'Hạng', 'Số dư điểm', 'Chi tiêu xét hạng', 'Tham gia', 'Thao tác']} empty={!rows.length}>{rows.map((member) => <tr key={member.user_id}><td>{member.users.full_name ?? member.users.email}<small className="d-block text-muted text-break">{member.users.email}</small></td><td>{member.users.phone || '—'}</td><td>{valueLabel(member.users.status)}</td><td>{valueLabel(member.tier_code)}</td><td>{member.balance}{member.balance < 0 && <small className="d-block text-danger">Điểm cần bù</small>}</td><td>{formatCurrency(member.qualifying_spend)}</td><td>{formatDateTime(member.joined_at)}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => requestAdjustment(member.user_id, '', member.users.full_name || member.users.email)}>Điều chỉnh điểm</button><button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => showMember(member)}>Chi tiết</button></td></tr>)}</LoyaltyTable><LoyaltyPager pagination={pagination} onPage={(value) => { setLoading(true); setPage(value); }} /><button className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={() => mutate(() => api.runLoyaltyJobs(), 'Đã chạy đối soát điểm và xử lý hết hạn. Có thể chạy lại để xử lý các lô tiếp theo.')}>Đối soát và xử lý hết hạn</button></LoyaltyPanel>}
      {tab === 'rules' && <>
        <LoyaltyPanel title="Tạo phiên bản chính sách"><p className="small text-muted">Lưu bản nháp để rà soát, hoặc xác nhận công bố ngay/theo lịch. Phiên bản đã công bố không được sửa; giao dịch cũ giữ nguyên quy tắc đã dùng.</p>
          <form className="row g-3" onSubmit={saveRule}>
            <label className="col-12">Tên chính sách<input className="form-control mt-1" required maxLength={150} value={rule.name} onChange={(event) => setRule({ ...rule, name: event.target.value })} /></label>
            {[['spendPerPoint', 'Số đồng cho một điểm', 1], ['expiryDays', 'Hạn dùng điểm (ngày)', 1], ['tierPeriodDays', 'Chu kỳ xét hạng (ngày)', 1]].map(([key, name, min]) => <label className="col-md-4" key={key}>{name}<input type="number" className="form-control mt-1" required min={min} max={key === 'spendPerPoint' ? 1000000000 : 3650} value={rule.config[key]} onChange={(event) => changeConfig(key, event.target.value)} /></label>)}
            <div className="col-12"><LoyaltyTable columns={['Mã hạng', 'Tên hạng', 'Chi tiêu tối thiểu (đồng)', 'Hệ số (10000 = ×1)', 'Quyền lợi', 'Thao tác']}>
              {rule.config.tiers.map((tier, index) => <tr key={index}><td><input aria-label={`Mã hạng ${index + 1}`} className="form-control form-control-sm" required pattern="[A-Z][A-Z0-9_]{0,29}" value={tier.code} onChange={(event) => changeTier(index, 'code', event.target.value)} /></td><td><input aria-label={`Tên hạng ${index + 1}`} className="form-control form-control-sm" required maxLength={100} value={tier.name} onChange={(event) => changeTier(index, 'name', event.target.value)} /></td><td><input aria-label={`Ngưỡng hạng ${index + 1}`} type="number" className="form-control form-control-sm" required min={0} value={tier.minimumSpend} onChange={(event) => changeTier(index, 'minimumSpend', event.target.value)} /></td><td><input aria-label={`Hệ số hạng ${index + 1}`} type="number" className="form-control form-control-sm" required min={1} max={100000} value={tier.multiplierBps} onChange={(event) => changeTier(index, 'multiplierBps', event.target.value)} /></td><td><input aria-label={`Quyền lợi hạng ${index + 1}`} className="form-control form-control-sm" maxLength={500} value={tier.benefits ?? ''} onChange={(event) => changeTier(index, 'benefits', event.target.value)} /></td><td><button type="button" className="btn btn-sm btn-outline-danger" disabled={rule.config.tiers.length < 2} onClick={() => setRule({ ...rule, config: { ...rule.config, tiers: rule.config.tiers.filter((_, row) => row !== index) } })}>Bỏ hạng</button></td></tr>)}
            </LoyaltyTable></div><div className="col-12"><button type="button" className="btn btn-sm btn-outline-secondary" disabled={rule.config.tiers.length >= 10} onClick={() => setRule({ ...rule, config: { ...rule.config, tiers: [...rule.config.tiers, { code: "", name: "", minimumSpend: 0, multiplierBps: 10000, benefits: "" }] } })}>Thêm hạng</button></div><label className="col-md-6">Hiệu lực từ (để trống: ngay khi công bố)<input type="datetime-local" className="form-control mt-1" value={ruleDate} onChange={(event) => setRuleDate(event.target.value)} /></label><div className="d-flex gap-2"><button className="btn btn-outline-primary" name="intent" value="DRAFT" disabled={busy}>Lưu bản nháp</button><button className="btn btn-primary" name="intent" value="PUBLISHED" disabled={busy}>Xác nhận công bố</button>{ruleEditor && <button type="button" className="btn btn-outline-secondary" onClick={() => { setRuleEditor(null); setRuleDate(''); setRule({ name: '', config: structuredClone(DEFAULT_RULE_FORM) }); }}>Hủy chỉnh sửa</button>}</div>
          </form>
        </LoyaltyPanel>
        <LoyaltyPanel title="Các phiên bản gần nhất">{!rows.length && <p>Chưa có chính sách.</p>}{rows.map((version) => <article className="border-bottom py-3" key={String(version.id)}><div className="d-flex justify-content-between gap-2"><strong>#{version.id} · {version.name}</strong><span className="badge text-bg-light">{version.status === 'PUBLISHED' && new Date(version.effective_at) > new Date() ? 'Đã công bố · chờ hiệu lực' : version.status === 'PUBLISHED' ? 'Đã áp dụng' : labels[version.status]}</span></div>
          <p className="small my-2">{formatCurrency(version.config.spendPerPoint)}/điểm · Hạn {version.config.expiryDays} ngày · Chu kỳ hạng {version.config.tierPeriodDays} ngày{version.effective_at && ` · Hiệu lực ${formatDateTime(version.effective_at)}`}</p>
          <div className="d-flex gap-2 flex-wrap"><button className="btn btn-sm btn-outline-secondary" onClick={() => { setRuleEditor(null); setRuleDate(''); setRule({ name: `${version.name} — phiên bản mới`, config: structuredClone(version.config) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Sao chép thành bản nháp mới</button>
            {version.status === 'DRAFT' && <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => { setRuleEditor({ id: version.id, version: version.version }); setRule({ name: version.name, config: structuredClone(version.config) }); setRuleDate(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Chỉnh sửa bản nháp</button>}
            {['DRAFT', 'SUBMITTED'].includes(version.status) && <><label className="small">Hiệu lực từ (để trống: ngay)<input type="datetime-local" className="form-control form-control-sm" value={dates[version.id] ?? ''} onChange={(event) => setDates({ ...dates, [version.id]: event.target.value })} /></label><button className="btn btn-sm btn-success" disabled={busy} onClick={() => mutate(() => window.confirm('Xác nhận công bố phiên bản này?') ? api.publishLoyaltyRule(version.id, dates[version.id] ? new Date(dates[version.id]).toISOString() : new Date().toISOString(), version.version) : Promise.reject(new Error('Đã hủy công bố')), 'Đã áp dụng chính sách.')}>Áp dụng chính sách</button></>}
          </div></article>)}</LoyaltyPanel>
      </>}
      {tab === 'rewards' && <>
        <LoyaltyPanel title={rewardEditor ? `Chỉnh sửa phần thưởng #${rewardEditor.id}` : 'Tạo phần thưởng'}><p className="small text-muted">Thay đổi chỉ áp dụng cho lượt đổi mới. Phiếu đã cấp giữ nguyên điều kiện. Tồn kho được kiểm tra lại khi lưu.</p>
        {rewardError && <div className="alert alert-danger" role="alert">{rewardError}{rewardEditor && <button type="button" className="btn btn-sm btn-outline-danger ms-2" disabled={busy} onClick={() => { if (window.confirm('Tải dữ liệu mới nhất? Các thay đổi chưa lưu trong biểu mẫu sẽ được thay thế.')) void editReward(rewardEditor.id); }}>Tải lại phần thưởng</button>}</div>}
        <form className="row g-3" ref={rewardFormRef} onSubmit={saveReward} aria-busy={busy}>
          <label className="col-md-6">Tên phần thưởng<input className="form-control mt-1" required maxLength={150} value={reward.name} onChange={(event) => setReward({ ...reward, name: event.target.value })} /></label>
          <label className="col-md-6">Mô tả<input className="form-control mt-1" maxLength={1000} value={reward.description} onChange={(event) => setReward({ ...reward, description: event.target.value })} /></label>
          {[['pointsCost', 'Điểm cần đổi', 1], ['discountValue', 'Giá trị phiếu ưu đãi (đồng)', 1], ['minOrderValue', 'Giá trị hàng tối thiểu (đồng)', 0], ['stock', 'Số phần thưởng', 0], ['minimumTierSpend', 'Chi tiêu xét hạng tối thiểu (đồng)', 0], ['voucherDays', 'Hạn phiếu ưu đãi (ngày)', 1]].map(([key, name, min]) => <label className="col-md-4" key={key}>{name}<input className="form-control mt-1" type="number" required min={min} max={key === 'voucherDays' ? 365 : key === 'stock' ? 1000000 : key === 'pointsCost' ? 100000000 : 1000000000} value={reward[key]} onChange={(event) => setReward({ ...reward, [key]: Number(event.target.value) })} /></label>)}
          <div><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : rewardEditor ? 'Lưu thay đổi' : 'Tạo phần thưởng'}</button>{rewardEditor && <button type="button" className="btn btn-outline-secondary ms-2" disabled={busy} onClick={() => { setRewardEditor(null); setRewardError(''); setReward({ ...NEW_REWARD }); }}>Hủy chỉnh sửa</button>}</div>
        </form></LoyaltyPanel>
        <LoyaltyPanel title="Phần thưởng gần nhất"><LoyaltyTable columns={['Phần thưởng', 'Điểm', 'Giá trị phiếu ưu đãi', 'Còn lại', 'Trạng thái', 'Thao tác']} empty={!rows.length}>{rows.map((row) => <tr key={String(row.id)}><td>{row.name}</td><td>{row.points_cost}</td><td>{formatCurrency(row.discount_value)}</td><td>{row.stock}</td><td>{row.active ? 'Đang mở' : 'Tạm dừng'}</td><td><button className="btn btn-sm btn-outline-secondary" disabled={busy || Boolean(rewardEditor)} onClick={() => mutate(() => api.setLoyaltyRewardStatus(row.id, !row.active, row.version), 'Đã cập nhật trạng thái phần thưởng.')}>{row.active ? 'Tạm dừng' : 'Mở lại'}</button><button className="btn btn-sm btn-outline-primary ms-2" disabled={busy} onClick={() => editReward(row.id)}>Chỉnh sửa</button></td></tr>)}</LoyaltyTable></LoyaltyPanel>
      </>}
      {tab === 'complaints' && <LoyaltyPanel title="Tiếp nhận khiếu nại">{!rows.length && <p className="text-muted">Chưa có khiếu nại.</p>}{rows.map((row) => <article className="border-bottom py-3" key={String(row.id)}><div className="d-flex justify-content-between"><strong>#{row.id} · {labels[row.type]}</strong><span>{labels[row.status]}</span></div><small className="text-muted d-block text-break">Thành viên: {row.member_id} · Đơn: {row.order_id ?? '—'} · {formatDateTime(row.created_at)}</small><p className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>{row.message}</p>{row.response && <p>Phản hồi: {row.response}</p>}
        {['OPEN', 'IN_REVIEW'].includes(row.status) && <><label className="d-block mb-2">Phản hồi<textarea className="form-control" maxLength={2000} value={notes[`complaint:${row.id}`] ?? ''} onChange={(event) => setNotes({ ...notes, [`complaint:${row.id}`]: event.target.value })} /></label><div className="d-flex flex-wrap gap-2">{[['IN_REVIEW', 'Tiếp nhận xử lý'], ['RESOLVED', 'Đánh dấu đã giải quyết'], ['REJECTED', 'Từ chối']].map(([status, name]) => <button className="btn btn-sm btn-outline-primary" key={status} disabled={busy} onClick={() => mutate(() => api.resolveLoyaltyComplaint(row.id, { status, response: noteFor(`complaint:${row.id}`), expectedUpdatedAt: row.updated_at }), 'Đã cập nhật khiếu nại.')}>{name}</button>)}<button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => requestAdjustment(row.member_id, row.id)}>Tạo yêu cầu điều chỉnh điểm</button></div></>}
      </article>)}<LoyaltyPager pagination={pagination} onPage={(value) => { setLoading(true); setPage(value); }} /></LoyaltyPanel>}
      {tab === 'adjustments' && <>
        <LoyaltyPanel title="Điều chỉnh điểm"><p className="small text-muted">Xác nhận để áp dụng ngay, hoặc lưu chờ duyệt nếu cần rà soát. Mọi thay đổi đều có lý do, người xác nhận và nhật ký. Điều chỉnh không làm tăng chi tiêu xét hạng.</p><form className="row g-3" onSubmit={saveAdjustment}>
          <div className="col-md-6"><LoyaltyMemberPicker value={adjustment.memberId} selectedLabel={adjustment.memberLabel} disabled={busy} onChange={(memberId, memberLabel) => setAdjustment(current => ({ ...current, memberId, memberLabel, complaintId: '' }))} /></div>
          <label className="col-md-3">Điểm cộng/trừ<input className="form-control mt-1" type="number" required min={-1000000} max={1000000} value={adjustment.points} onChange={(event) => setAdjustment({ ...adjustment, points: Number(event.target.value) })} /></label>
          <label className="col-md-3">Mã khiếu nại (nếu có)<input className="form-control mt-1" inputMode="numeric" pattern="[1-9][0-9]{0,17}" value={adjustment.complaintId} onChange={(event) => setAdjustment({ ...adjustment, complaintId: event.target.value })} /></label>
          <label className="col-12">Lý do<textarea className="form-control mt-1" required minLength={10} maxLength={2000} rows={2} value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} /></label><label className="col-12"><input type="checkbox" className="form-check-input me-2" checked={applyImmediately} onChange={(event) => setApplyImmediately(event.target.checked)} />Xác nhận áp dụng ngay (bỏ chọn để lưu chờ duyệt)</label><div><button className="btn btn-primary" disabled={busy || !adjustment.memberId || Number(adjustment.points) === 0}>{applyImmediately ? "Xác nhận điều chỉnh" : "Lưu chờ duyệt"}</button></div>
        </form></LoyaltyPanel>
        <LoyaltyPanel title="Lịch sử điều chỉnh điểm">{!rows.length && <p className="text-muted">Chưa có yêu cầu.</p>}{rows.map((row) => <article key={String(row.id)} className="border-bottom py-3"><div className="d-flex justify-content-between"><strong>#{row.id} · {row.points > 0 ? '+' : ''}{row.points} điểm</strong><span>{labels[row.status]}</span></div><small className="text-muted text-break">Thành viên: {row.member_id} · Người tạo: {row.requested_by}</small><p className="mt-2 mb-1">{row.reason}</p>{row.decision_note && <p className="small">Quyết định: {row.decision_note} · {formatDateTime(row.decided_at)}</p>}
          {row.status === 'PENDING' && (<><label className="d-block my-2">Lý do quyết định<input className="form-control form-control-sm" maxLength={2000} value={notes[`adjustment:${row.id}`] ?? ''} onChange={(event) => setNotes({ ...notes, [`adjustment:${row.id}`]: event.target.value })} /></label><div className="d-flex gap-2">{[['APPROVED', 'Phê duyệt'], ['REJECTED', 'Từ chối']].map(([decision, name]) => <button key={decision} className={`btn btn-sm ${decision === 'APPROVED' ? 'btn-success' : 'btn-outline-danger'}`} disabled={busy} onClick={() => mutate(() => api.decideLoyaltyAdjustment(row.id, { decision, note: noteFor(`adjustment:${row.id}`) }), 'Đã xử lý yêu cầu điều chỉnh.')}>{name}</button>)}</div></>)}
        </article>)}</LoyaltyPanel>
      </>}
      {tab === 'audit' && !error && <LoyaltyAuditHistory rows={rows} users={auditUsers} />}
      {['adjustments', 'audit'].includes(tab) && <LoyaltyPager pagination={pagination} onPage={(value) => { setPage(value); setLoading(true); }} />}
    </>}
  </div>;
}
