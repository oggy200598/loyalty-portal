import { useId, useState } from 'react';
import { formatCurrency, valueLabel } from './format';
import './dashboardCharts.css';

export function PointChart({ charts }) {
  const [days, setDays] = useState(30);
  const id = useId();
  const allTime = days === 'all';
  const periodLabel = allTime ? 'trong toàn bộ thời gian' : `trong ${days} ngày`;
  const rows = allTime ? (charts?.monthly ?? []) : (charts?.daily ?? []).slice(-days);
  const added = rows.reduce((sum, row) => sum + row.added, 0);
  const deducted = rows.reduce((sum, row) => sum + row.deducted, 0);
  const max = Math.max(4, Math.ceil(Math.max(0, ...rows.flatMap(row => [row.added, row.deducted])) / 4) * 4);
  const step = 620 / Math.max(1, rows.length);
  const width = Math.min(12, step * .32);
  const number = value => Number(value).toLocaleString('vi-VN');
  const dayLabel = day => allTime ? `${day.slice(5, 7)}/${day.slice(0, 4)}` : `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  return <section className="dashboard-charts admin-surface point-chart" aria-labelledby={id}>
    <div className="admin-section-heading"><h2 id={id}>Biến động điểm thưởng</h2><select className="form-select form-select-sm" style={{ width: 'auto' }} aria-label="Khoảng thời gian điểm thưởng" value={days} onChange={event => setDays(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value={7}>7 ngày gần nhất</option><option value={30}>30 ngày gần nhất</option><option value="all">Tất cả thời gian</option></select></div>
    <div className="point-chart-totals"><span><i aria-hidden="true" />Điểm cộng <strong>{number(added)}</strong></span><span><i aria-hidden="true" />Điểm trừ <strong>{number(deducted)}</strong></span></div>
    {rows.length ? <>
      <div className="admin-chart-scroll"><svg className="admin-line-chart" viewBox="0 0 720 260" role="img" aria-label={`Điểm cộng ${number(added)}, điểm trừ ${number(deducted)} ${periodLabel}. Bảng số liệu ở bên dưới.`}>
        {[0, 1, 2, 3, 4].map(index => <g key={index}><line x1="64" x2="688" y1={212 - index * 41} y2={212 - index * 41} stroke="#e8eaee" /><text x="54" y={216 - index * 41} textAnchor="end">{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(max * index / 4)}</text></g>)}
        {rows.map((row, index) => { const x = 66 + step * (index + .5); return <g key={row.day}>
          <rect x={x - width - 1} y={212 - row.added / max * 164} width={width} height={row.added / max * 164} fill="#ee4d2d"><title>{row.day}: cộng {number(row.added)} điểm</title></rect>
          <rect x={x + 1} y={212 - row.deducted / max * 164} width={width} height={row.deducted / max * 164} fill="#64748b"><title>{row.day}: trừ {number(row.deducted)} điểm</title></rect>
          {(index === 0 || index === rows.length - 1 || index % (allTime ? Math.max(1, Math.ceil(rows.length / 6)) : days === 7 ? 1 : 5) === 0) && <text x={x} y="239" textAnchor="middle">{dayLabel(row.day)}</text>}
        </g>; })}
      </svg></div>
      <p className="admin-chart-note">Theo {allTime ? 'tháng' : 'ngày'} ghi nhận (giờ Việt Nam). Điểm cộng gồm tích điểm và điều chỉnh tăng; điểm trừ gồm đổi thưởng, hết hạn, thu hồi và điều chỉnh giảm.</p>
      <details className="admin-chart-details"><summary>Xem bảng số liệu</summary><div className="table-responsive"><table className="table table-sm"><caption className="visually-hidden">Biến động điểm {periodLabel}</caption><thead><tr><th scope="col">{allTime ? 'Tháng' : 'Ngày'}</th><th scope="col">Điểm cộng</th><th scope="col">Điểm trừ</th></tr></thead><tbody>{rows.map(row => <tr key={row.day}><td>{dayLabel(row.day)}</td><td>{number(row.added)}</td><td>{number(row.deducted)}</td></tr>)}</tbody></table></div></details>
    </> : <p className="admin-chart-empty">Chưa có dữ liệu điểm thưởng.</p>}
  </section>;
}

export function DistributionChart({ title, rows = [], unit = 'bản ghi' }) {
  const id = useId();
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return <section className="dashboard-charts admin-surface" aria-labelledby={id}>
    <div className="admin-section-heading"><h2 id={id}>{title}</h2><span>Toàn thời gian</span></div>
    <div className="admin-status-chart"><p><strong>{total.toLocaleString('vi-VN')}</strong> {unit}</p>{total ? <ul>{[...rows].sort((a, b) => b.count - a.count).map(row => <li key={row.label}><div><span>{valueLabel(row.label)}</span><b>{row.count.toLocaleString('vi-VN')} <small>({(row.count / total * 100).toFixed(1).replace('.', ',')}%)</small></b></div><div className="admin-status-track" aria-hidden="true"><span style={{ width: `${row.count / total * 100}%` }} /></div></li>)}</ul> : <p className="text-muted small">Chưa có dữ liệu.</p>}</div>
  </section>;
}

export function OrderCharts({ charts }) {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState('revenue');
  const [selected, setSelected] = useState(null);
  const allTime = days === 'all';
  const periodLabel = allTime ? 'trong toàn bộ thời gian' : `trong ${days} ngày`;
  const daily = allTime ? (charts?.monthly ?? []) : (charts?.daily ?? []).slice(-days);
  const statuses = [...(charts?.orderStatuses ?? [])].sort((a, b) => b.count - a.count);
  const totalOrders = statuses.reduce((sum, row) => sum + row.count, 0);
  const max = metric === 'orders' ? Math.max(4, Math.ceil(Math.max(0, ...daily.map(row => row.orders)) / 4) * 4) : Math.max(1, ...daily.map(row => row.revenue));
  const total = daily.reduce((sum, row) => sum + row[metric], 0);
  const money = metric === 'revenue';
  const formatValue = value => money ? formatCurrency(value) : `${value.toLocaleString('vi-VN')} đơn`;
  const shortNumber = value => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const shortDate = day => allTime ? `${day.slice(5, 7)}/${day.slice(0, 4)}` : `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  const points = daily.map((row, index) => ({ x: 62 + index * 626 / Math.max(1, daily.length - 1), y: 212 - row[metric] / max * 164, row }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const current = points.find(point => point.row.day === selected);
  return <div className="dashboard-charts admin-chart-grid">
    <section className="admin-surface admin-trend-chart" aria-labelledby="overview-trend-title">
      <div className="admin-section-heading"><h2 id="overview-trend-title">Đơn hàng theo {allTime ? 'tháng' : 'ngày'}</h2><select className="form-select form-select-sm" aria-label="Khoảng thời gian biểu đồ" value={days} onChange={event => { setDays(event.target.value === 'all' ? 'all' : Number(event.target.value)); setSelected(null); }}><option value={7}>7 ngày gần nhất</option><option value={30}>30 ngày gần nhất</option><option value="all">Tất cả thời gian</option></select></div>
      <div className="admin-chart-summary"><div><span>{money ? 'Giá trị đơn đã giao' : 'Đơn đã đặt'} {periodLabel}</span><strong>{formatValue(total)}</strong></div><div className="admin-chart-switch" role="group" aria-label="Chỉ số biểu đồ"><button type="button" aria-pressed={money} onClick={() => setMetric('revenue')}>Giá trị</button><button type="button" aria-pressed={!money} onClick={() => setMetric('orders')}>Số đơn</button></div></div>
      {daily.length ? <>
        <div className="admin-chart-scroll"><svg viewBox="0 0 720 260" className="admin-line-chart" role="img" aria-labelledby="overview-chart-title overview-chart-desc">
          <title id="overview-chart-title">{money ? 'Giá trị đơn đã giao' : 'Số đơn đặt'} {periodLabel}</title>
          <desc id="overview-chart-desc">Theo {allTime ? 'tháng' : 'ngày'} đặt đơn, múi giờ Việt Nam. Bảng số liệu chi tiết ở bên dưới biểu đồ.</desc>
          {[0, 1, 2, 3, 4].map(index => { const y = 212 - index * 41; return <g key={index}><line x1="62" x2="688" y1={y} y2={y} stroke="#e8eaee" /><text x="52" y={y + 4} textAnchor="end">{money ? shortNumber(max * index / 4) : Math.floor(max * index / 4)}</text></g>; })}
          <path d={`${path} L 688 212 L 62 212 Z`} fill="#ee4d2d" fillOpacity="0.05" />
          <path d={path} fill="none" stroke="#ee4d2d" strokeWidth="2.5" strokeLinejoin="round" />
          {points.map((point, index) => <g key={point.row.day}>
            {(index === 0 || index === points.length - 1 || index % (allTime ? Math.max(1, Math.ceil(points.length / 6)) : days === 7 ? 1 : 5) === 0) && <text x={point.x} y="239" textAnchor="middle">{shortDate(point.row.day)}</text>}
            <circle cx={point.x} cy={point.y} r={current?.row.day === point.row.day ? 5 : 3} fill="#ee4d2d" />
            <rect x={point.x - 626 / Math.max(1, daily.length - 1) / 2} y="38" width={626 / Math.max(1, daily.length - 1)} height="180" fill="transparent" onMouseEnter={() => setSelected(point.row.day)} onClick={() => setSelected(point.row.day)}><title>{point.row.day}: {formatValue(point.row[metric])}</title></rect>
          </g>)}
        </svg></div>
        <p className="admin-chart-caption" aria-live="polite">{current ? `${shortDate(current.row.day)}: ${formatValue(current.row[metric])}` : `Chọn một ${allTime ? 'tháng' : 'ngày'} trên biểu đồ để xem số liệu.`}</p>
        <p className="admin-chart-note">Theo {allTime ? 'tháng' : 'ngày'} đặt đơn (giờ Việt Nam). Giá trị chỉ gồm đơn hiện đã giao hoặc hoàn tất.</p>
        <details className="admin-chart-details"><summary>Xem bảng số liệu</summary><div className="table-responsive"><table className="table table-sm"><caption className="visually-hidden">Số liệu đơn hàng {periodLabel}</caption><thead><tr><th scope="col">{allTime ? 'Tháng đặt' : 'Ngày đặt'}</th><th scope="col">Số đơn</th><th scope="col">Giá trị đơn đã giao</th></tr></thead><tbody>{daily.map(row => <tr key={row.day}><td>{shortDate(row.day)}</td><td>{row.orders.toLocaleString('vi-VN')}</td><td>{formatCurrency(row.revenue)}</td></tr>)}</tbody></table></div></details>
      </> : <p className="admin-chart-empty">Chưa có dữ liệu biểu đồ.</p>}
    </section>
    <section className="admin-surface" aria-labelledby="overview-status-title">
      <div className="admin-section-heading"><h2 id="overview-status-title">Trạng thái đơn hàng</h2><span>Toàn thời gian</span></div>
      <div className="admin-status-chart"><p><strong>{totalOrders.toLocaleString('vi-VN')}</strong> đơn hàng</p>{statuses.length ? <ul>{statuses.map(row => <li key={row.status}><div><span>{valueLabel(row.status)}</span><b>{row.count.toLocaleString('vi-VN')} <small>({totalOrders ? (row.count / totalOrders * 100).toFixed(1).replace('.', ',') : 0}%)</small></b></div><div className="admin-status-track" aria-hidden="true"><span style={{ width: `${totalOrders ? row.count / totalOrders * 100 : 0}%` }} /></div></li>)}</ul> : <p className="text-muted small">Chưa có đơn hàng.</p>}</div>
    </section>
  </div>;
}
