import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../common/api';
import { useAuth } from '../accounts/authContext';
import { formatCurrency } from '../common/format';

function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [mutating, setMutating] = useState(false);

  function load() {
    if (!isAuthenticated) return Promise.resolve();
    return api.getCart().then((cart) => {
      setError(null);
      const rawItems = (cart?.cart_items ?? []).map((item) => ({ id: String(item.id), productId: String(item.product_id), quantity: item.quantity, unitPrice: Number(item.product_variants?.price ?? item.products?.price ?? item.price ?? 0), name: item.products?.name ?? 'Sản phẩm', stockQuantity: Math.min(Number(item.products?.stock_quantity ?? 0), Number(item.product_variants?.stock_quantity ?? item.products?.stock_quantity ?? 0)) }));
      setItems(rawItems); setSelected(Object.fromEntries(rawItems.map((item) => [item.id, true])));
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const selectedItems = useMemo(
    () => items.filter((item) => selected[item.id]),
    [items, selected],
  );

  const subtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    [selectedItems],
  );

  async function handleQuantity(item, quantity) {
    if (quantity < 1 || mutating) return;
    const capped = Math.min(quantity, item.stockQuantity || quantity);
    try {
      setMutating(true);
      await api.updateCartItem(item.id, capped);
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: capped } : entry,
        ),
      );
    } catch {
      // giữ nguyên nếu lỗi
    } finally {
      setMutating(false);
    }
  }

  async function handleRemove(item) {
    if (mutating) return;
    try {
      setMutating(true);
      await api.removeCartItem(item.id);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch {
      // bỏ qua
    } finally {
      setMutating(false);
    }
  }

  function toggleAll(event) {
    setSelected(
      Object.fromEntries(items.map((item) => [item.id, event.target.checked])),
    );
  }

  const allSelected =
    items.length > 0 && items.every((item) => selected[item.id]);

  if (!isAuthenticated) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-lock" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">Vui lòng đăng nhập để xem giỏ hàng</h1>
        <Link
          to="/dang-nhap"
          className="btn text-white px-4"
          style={{ background: '#ee4d2d' }}
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">
        Đang tải giỏ hàng...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 text-center text-danger">{error}</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-cart-x" style={{ fontSize: 56, color: '#ddd' }} />

        <h1 className="h5 mt-3">Giỏ hàng trống</h1>

        <p className="text-muted">Hãy thêm sản phẩm vào giỏ hàng nhé!</p>

        <Link
          to="/san-pham"
          className="btn text-white px-4"
          style={{ background: '#ee4d2d' }}
        >
          Mua sắm ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="h5 fw-bold mb-3">Giỏ hàng ({items.length})</h1>

      <div className="row g-3">
        <div className="col-lg-8">
          <div
            className="bg-white rounded-3 border p-3"
            style={{ borderColor: '#f1f1f1' }}
          >
            <div className="d-flex align-items-center gap-2 pb-2 mb-2 border-bottom">
              <input
                type="checkbox"
                className="form-check-input mt-0"
                checked={allSelected}
                onChange={toggleAll}
              />

              <span className="small fw-semibold">
                Chọn tất cả ({items.length})
              </span>

              <button
                type="button"
                className="btn btn-sm btn-link text-danger text-decoration-none ms-auto p-0"
                onClick={() => {
                  selectedItems.forEach(handleRemove);
                }}
              >
                Xóa đã chọn
              </button>
            </div>

            {items.map((item) => (
              <div key={item.id} className="d-flex gap-3 py-3 border-bottom">
                <input
                  type="checkbox"
                  className="form-check-input mt-0"
                  checked={Boolean(selected[item.id])}
                  onChange={(event) =>
                    setSelected((prev) => ({
                      ...prev,
                      [item.id]: event.target.checked,
                    }))
                  }
                />

                <div
                  className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 56, height: 56, background: '#fafafa', fontSize: 22 }}
                >
                  🛍️
                </div>

                <div className="flex-grow-1 min-width-0">
                  <div className="d-flex justify-content-between gap-2">
                    <span
                      className="text-truncate small fw-semibold"
                      style={{ maxWidth: 320 }}
                    >
                      {item.name}
                    </span>

                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => handleRemove(item)}
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </div>

                  <div className="d-flex align-items-center gap-3 mt-2">
                    <div className="input-group input-group-sm" style={{ width: 120 }}>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled={mutating || item.quantity <= 1}
                        onClick={() => handleQuantity(item, item.quantity - 1)}
                      >
                        −
                      </button>

                      <input
                        type="text"
                        className="form-control text-center"
                        value={item.quantity}
                        readOnly
                      />

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled={
                          mutating || item.quantity >= item.stockQuantity
                        }
                        onClick={() => handleQuantity(item, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <span
                      className="ms-auto fw-bold"
                      style={{ color: '#ee4d2d' }}
                    >
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="col-lg-4">
          <div
            className="bg-white rounded-3 border p-3 position-sticky"
            style={{ borderColor: '#f1f1f1', top: 80 }}
          >
            <h2 className="h6 fw-bold mb-3">Thông tin đơn hàng</h2>

            <div className="d-flex justify-content-between small mb-2">
              <span className="text-muted">Tạm tính ({selectedItems.length} SP)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <hr />

            <div className="d-flex justify-content-between mb-3">
              <span className="fw-semibold">Tổng cộng</span>
              <span className="fw-bold" style={{ color: '#ee4d2d', fontSize: 18 }}>
                {formatCurrency(subtotal)}
              </span>
            </div>

            <button
              type="button"
              className="btn w-100 text-white"
              style={{ background: '#ee4d2d' }}
              disabled={selectedItems.length === 0}
              onClick={() => navigate('/thanh-toan', { state: { selectedCartIds: selectedItems.map((item) => item.id) } })}
            >
              Thanh toán ({selectedItems.length})
            </button>

            <Link
              to="/san-pham"
              className="btn btn-outline-secondary w-100 mt-2"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
