import { AdminTable } from './AdminTable';
import { useAdminData } from './useAdminData';
import { api } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function AdminOrdersPage() {
  const { rows, loading, error } = useAdminData(() => api.getOrders(1, 50));

  return (
    <AdminTable
      title="Quản lý Orders"
      columns={['Mã đơn', 'Khách hàng', 'Shop ID', 'Tổng tiền', 'Trạng thái', 'Ngày đặt']}
      rows={rows?.data ?? []}
      loading={loading}
      error={error}
      renderRow={(order) => (
        <tr key={String(order.id)}>
          <td className="fw-semibold">{order.order_code}</td>
          <td>{order.shipping_receiver_name}</td>
          <td>{order.shop_id}</td>
          <td>{formatCurrency(Number(order.total_amount))}</td>
          <td>{order.status}</td>
          <td>{formatDateTime(order.created_at)}</td>
        </tr>
      )}
    />
  );
}
