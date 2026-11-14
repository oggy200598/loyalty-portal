import { formatCurrency, formatDateTime, valueLabel } from '../common/format';

const fields = {
  name: 'Tên', description: 'Mô tả', status: 'Trạng thái', active: 'Trạng thái mở thưởng',
  points: 'Điểm điều chỉnh', balance: 'Số dư điểm', remaining: 'Điểm còn lại', points_cost: 'Điểm cần đổi', points_spent: 'Điểm đã dùng',
  reason: 'Lý do', decision_note: 'Kết quả xử lý', response: 'Phản hồi', message: 'Nội dung khiếu nại', type: 'Loại khiếu nại',
  member_id: 'Khách hàng', memberId: 'Khách hàng', user_id: 'Khách hàng',
  requested_by: 'Người đề nghị', decided_by: 'Người xác nhận', handled_by: 'Người xử lý', created_by: 'Người tạo', published_by: 'Người công bố',
  order_id: 'Đơn hàng', orderId: 'Đơn hàng', complaint_id: 'Khiếu nại liên quan', rewardId: 'Phần thưởng', couponId: 'Phiếu ưu đãi', coupon_code: 'Mã ưu đãi',
  tier: 'Hạng thành viên', tier_code: 'Hạng thành viên', qualifying_spend: 'Chi tiêu xét hạng', qualifying_amount: 'Giá trị xét hạng',
  discount_value: 'Giá trị ưu đãi', min_order_value: 'Đơn hàng tối thiểu', minimum_tier_spend: 'Chi tiêu yêu cầu', stock: 'Số lượng còn lại', voucher_days: 'Hạn phiếu (ngày)',
  effective_at: 'Thời điểm hiệu lực', effectiveAt: 'Thời điểm hiệu lực', expires_at: 'Hết hạn', cycleStartedAt: 'Bắt đầu chu kỳ',
  'config.spendPerPoint': 'Số đồng cho một điểm', 'config.expiryDays': 'Hạn điểm (ngày)', 'config.tierPeriodDays': 'Chu kỳ hạng (ngày)', 'config.tiers': 'Hạng và quyền lợi',
};
const userFields = new Set(['member_id', 'memberId', 'user_id', 'requested_by', 'decided_by', 'handled_by', 'created_by', 'published_by']);
const moneyFields = new Set(['qualifying_spend', 'qualifying_amount', 'discount_value', 'min_order_value', 'minimum_tier_spend', 'config.spendPerPoint']);

function snapshot(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return snapshot(JSON.parse(raw)); } catch { return { description: raw }; } }
  if (typeof raw !== 'object' || Array.isArray(raw)) return {};
  const data = { ...raw };
  if (data.config) {
    const config = typeof data.config === 'string' ? snapshot(data.config) : data.config;
    for (const [key, value] of Object.entries(config)) data[`config.${key}`] = value;
  }
  return data;
}

function personName(id, users) { const person = users[id]; return person ? person.name || person.email : 'Không còn thông tin tài khoản'; }

function displayValue(key, value, users) {
  if (value == null || value === '') return '—';
  if (userFields.has(key)) return personName(value, users);
  if (key === 'active') return value ? 'Đang mở' : 'Tạm dừng';
  if (moneyFields.has(key)) return formatCurrency(value);
  if (['effective_at', 'effectiveAt', 'expires_at', 'cycleStartedAt'].includes(key)) return formatDateTime(value);
  if (['status', 'type', 'tier', 'tier_code'].includes(key)) { const label = valueLabel(value); return label === 'Chưa xác định' ? String(value) : label; }
  if (key === 'config.tiers' && Array.isArray(value)) return value.map(tier => `${tier.name || tier.code}: từ ${formatCurrency(tier.minimumSpend)}, hệ số ×${tier.multiplierBps / 10000}${tier.benefits ? `; ${tier.benefits}` : ''}`).join('\n');
  if (['points', 'balance', 'remaining', 'points_cost', 'points_spent', 'stock', 'voucher_days'].includes(key)) return Number(value).toLocaleString('vi-VN');
  return String(value);
}

function AuditChanges({ before, after, users }) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => fields[key] && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (!keys.length) return <span className="text-muted small">Đã ghi nhận hoạt động.</span>;
  return <details className="loyalty-audit-details"><summary>Xem {keys.length} thông tin {Object.keys(before).length ? 'thay đổi' : 'được ghi nhận'}</summary>
    <div className="table-responsive"><table className="table table-sm mb-0"><caption className="visually-hidden">So sánh dữ liệu trước và sau hoạt động</caption><thead><tr><th scope="col">Thông tin</th><th scope="col">Trước</th><th scope="col">Sau</th></tr></thead><tbody>{keys.map(key => <tr key={key}><th scope="row">{fields[key]}</th><td>{displayValue(key, before[key], users)}</td><td>{displayValue(key, after[key], users)}</td></tr>)}</tbody></table></div>
  </details>;
}

export default function LoyaltyAuditHistory({ rows, users = {} }) {
  return <section className="admin-surface loyalty-audit">
    <div className="admin-section-heading"><h2>Nhật ký hoạt động</h2><span>Theo dõi người thực hiện và nội dung thay đổi</span></div>
    <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th scope="col">Thời gian</th><th scope="col">Người thao tác</th><th scope="col">Hoạt động</th><th scope="col">Nội dung</th></tr></thead><tbody>
      {!rows.length && <tr><td colSpan={4} className="text-center text-muted py-4">Không có hoạt động phù hợp với bộ lọc.</td></tr>}
      {rows.map(row => {
        const before = snapshot(row.old_data), after = snapshot(row.new_data);
        const memberId = after.member_id || after.memberId || before.member_id || before.memberId;
        const points = after.points ?? before.points;
        const reason = after.reason || after.response || after.message || after.description;
        const name = after.name || before.name;
        const action = valueLabel(row.action);
        return <tr key={String(row.id)}>
          <td className="loyalty-audit-time">{formatDateTime(row.created_at)}</td>
          <td><strong>{row.users?.full_name || row.users?.email || 'Hệ thống'}</strong>{row.users?.full_name && <small className="d-block text-muted">{row.users.email}</small>}</td>
          <td><strong>{action === 'Chưa xác định' ? 'Hoạt động khác' : action}</strong><small className="d-block text-muted mt-1">{valueLabel(row.entity_type)}{row.entity_id != null ? ` #${row.entity_id}` : ''}</small></td>
          <td>
            <div className="loyalty-audit-summary">
              {memberId && <span>Khách hàng: <strong>{personName(memberId, users)}</strong></span>}
              {name && <span>{name}</span>}
              {points != null && <span className={Number(points) < 0 ? 'text-danger' : 'text-success'}>{Number(points) > 0 ? '+' : ''}{Number(points).toLocaleString('vi-VN')} điểm</span>}
              {after.status && <span className={`badge ${after.status === 'APPROVED' || after.status === 'RESOLVED' ? 'text-bg-success' : 'text-bg-light'}`}>{valueLabel(after.status)}</span>}
              {Object.hasOwn(after, 'active') && <span className="badge text-bg-light">{after.active ? 'Đang mở' : 'Tạm dừng'}</span>}
            </div>
            {reason && <p className="loyalty-audit-reason" title={reason}>{reason}</p>}
            <AuditChanges before={before} after={after} users={users} />
          </td>
        </tr>;
      })}
    </tbody></table></div>
  </section>;
}
