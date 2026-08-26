import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../auth/useAuth';
import {
  formatCurrency,
  isCouponApplicable,
  calcCouponDiscount,
} from '../../utils/format';

const SHIPPING_FEE = 25_000;
const FREE_SHIP_THRESHOLD = 500_000;

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    fullName: user?.name ?? '',
    phone: user?.phone ?? '',
    address: '',
    note: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [selectedCouponId, setSelectedCouponId] = useState('auto');
  const [placing, setPlacing] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (!isAuthenticated) {
          if (active) setItems([]);
          return;
        }

        const cart = await api.getCart();
        const mapped = (cart?.cart_items ?? []).map((item) => ({
          id: String(item.id),
          productId: String(item.product_id),
          quantity: item.quantity,
          unitPrice: Number(item.price ?? item.products?.price ?? 0),
          name: item.products?.name ?? 'Sản phẩm',
        }));

        if (!active) return;
        setItems(mapped);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không thể tải giỏ hàng');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );

  // Gom coupon khả dụng từ sản phẩm trong giỏ
  const availableCoupons = useMemo(() => {
    const map = new Map();

    items.forEach((item) => {
      (item.product?.coupons ?? []).forEach((coupon) => {
        if (!map.has(coupon.id) && isCouponApplicable(coupon, subtotal)) {
          map.set(coupon.id, coupon);
        }
      });
    });

    return [...map.values()];
  }, [items, subtotal]);

  // Tự động chọn coupon tốt nhất (chỉ để hiển thị — backend xác nhận giá cuối)
  const bestCoupon = useMemo(() => {
    let best = null;
    let bestDiscount = -1;

    availableCoupons.forEach((coupon) => {
      if (coupon.discountType === 'FREE_SHIP') {
        if (bestDiscount < SHIPPING_FEE) {
          best = coupon;
          bestDiscount = SHIPPING_FEE;
        }
        return;
      }

      const discount = calcCouponDiscount(coupon, subtotal);
      if (discount > bestDiscount) {
        best = coupon;
        bestDiscount = discount;
      }
    });

    return best;
  }, [availableCoupons, subtotal]);

  const activeCoupon = useMemo(() => {
    if (selectedCouponId === 'none') return null;
    if (selectedCouponId === 'auto') return bestCoupon;

    return (
      availableCoupons.find(
        (coupon) => String(coupon.id) === selectedCouponId,
      ) ?? null
    );
  }, [selectedCouponId, bestCoupon, availableCoupons]);

  const discount = activeCoupon
    ? activeCoupon.discountType === 'FREE_SHIP'
      ? 0
      : calcCouponDiscount(activeCoupon, subtotal)
    : 0;

  const freeship =
    activeCoupon?.discountType === 'FREE_SHIP' ||
    subtotal >= FREE_SHIP_THRESHOLD;

  const shippingFee = freeship ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - discount + shippingFee);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên người nhận';
    if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, '')))
      return 'Số điện thoại không hợp lệ';
    if (!form.address.trim()) return 'Vui lòng nhập địa chỉ nhận hàng';
    return null;
  }

  async function handlePlaceOrder(event) {
    event.preventDefault();

    const validationError = validate();
    setFormError(validationError);

    if (validationError) return;

    try {
      setPlacing(true);

      const response = await api.placeOrder({
        customerName: form.fullName,
        phone: form.phone,
        address: form.address,
        paymentMethod,
        subtotal,
        discount,
        shippingFee,
        total,
        items: items.map((item) => ({
          productId: Number(item.productId),
          productName: item.name,
          variantName: '',
          imageUrl: '',
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      });

      await api.clearCart();

      // Lưu kết quả risk assessment tạm để trang success hiển thị
      if (response?.riskAssessment?.prediction) {
        sessionStorage.setItem(
          `risk_${response.id}`,
          JSON.stringify(response.riskAssessment.prediction),
        );
      }

      navigate(`/order-success/${response.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('401') || message.toLowerCase().includes('token')) {
        setFormError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setFormError('Đặt hàng thất bại. Vui lòng thử lại.');
      }
    } finally {
      setPlacing(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-lock" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">Vui lòng đăng nhập để thanh toán</h1>
        <button
          type="button"
          className="btn text-white px-4 mt-3"
          style={{ background: '#ee4d2d' }}
          onClick={() => navigate('/login')}
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">Đang tải...</div>
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
        <h1 className="h5">Không có sản phẩm để thanh toán</h1>
        <button
          type="button"
          className="btn mt-3 text-white"
          style={{ background: '#ee4d2d' }}
          onClick={() => navigate('/products')}
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="h5 fw-bold mb-3">Thanh toán</h1>

      {formError && (
        <div className="alert alert-danger py-2 small">{formError}</div>
      )}

      <form onSubmit={handlePlaceOrder}>
        <div className="row g-3">
          <div className="col-lg-8">
            <div
              className="bg-white rounded-3 border p-3 mb-3"
              style={{ borderColor: '#f1f1f1' }}
            >
              <h2 className="h6 fw-bold mb-3">
                <i className="bi bi-geo-alt me-1" style={{ color: '#ee4d2d' }} />
                Thông tin nhận hàng
              </h2>

              <div className="row g-2">
                <div className="col-md-6">
                  <input
                    className="form-control"
                    name="fullName"
                    placeholder="Họ tên người nhận"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <input
                    className="form-control"
                    name="phone"
                    placeholder="Số điện thoại (09xxxxxxxx)"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <input
                    className="form-control"
                    name="address"
                    placeholder="Địa chỉ chi tiết"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <textarea
                    className="form-control"
                    name="note"
                    rows={2}
                    placeholder="Ghi chú cho người bán (tùy chọn)"
                    value={form.note}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div
              className="bg-white rounded-3 border p-3 mb-3"
              style={{ borderColor: '#f1f1f1' }}
            >
              <h2 className="h6 fw-bold mb-3">
                <i className="bi bi-wallet2 me-1" style={{ color: '#ee4d2d' }} />
                Phương thức thanh toán
              </h2>

              {['COD', 'MOMO', 'BANK_TRANSFER'].map((method) => (
                <div key={method} className="form-check mb-2">
                  <input
                    type="radio"
                    className="form-check-input"
                    id={`pm-${method}`}
                    name="paymentMethod"
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />

                  <label className="form-check-label small" htmlFor={`pm-${method}`}>
                    {method === 'COD'
                      ? 'Thanh toán khi nhận hàng (COD)'
                      : method === 'MOMO'
                        ? 'Ví MoMo'
                        : 'Chuyển khoản ngân hàng'}
                  </label>
                </div>
              ))}
            </div>

            {/* Sản phẩm */}
            <div
              className="bg-white rounded-3 border p-3"
              style={{ borderColor: '#f1f1f1' }}
            >
              <h2 className="h6 fw-bold mb-3">Sản phẩm ({items.length})</h2>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="d-flex justify-content-between small border-bottom py-2"
                >
                  <span className="text-truncate" style={{ maxWidth: 300 }}>
                    {item.name} × {item.quantity}
                  </span>

                  <span className="fw-semibold flex-shrink-0">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
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
                <span className="text-muted">Tạm tính</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="d-flex justify-content-between small mb-2 text-success">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="d-flex justify-content-between small mb-2">
                <span className="text-muted">Phí vận chuyển</span>
                <span>{shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}</span>
              </div>

              <hr />

              <div className="d-flex justify-content-between mb-3">
                <span className="fw-semibold">Tổng cộng</span>
                <span className="fw-bold" style={{ color: '#ee4d2d', fontSize: 18 }}>
                  {formatCurrency(total)}
                </span>
              </div>

              <button
                type="submit"
                className="btn w-100 text-white"
                style={{ background: '#ee4d2d' }}
                disabled={placing}
              >
                {placing ? 'Đang đặt hàng...' : 'Đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CheckoutPage;
