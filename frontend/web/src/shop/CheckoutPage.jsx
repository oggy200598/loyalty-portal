import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddressPicker } from '../accounts/AddressBook';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkoutItems, selectedCartItems } from './checkout';
import { api } from '../common/api';
import { useAuth } from '../accounts/authContext';
import {
  formatCurrency,
  isCouponApplicable,
  calcCouponDiscount,
} from '../common/format';

function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedCartIds = location.state?.selectedCartIds;
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [deliveryPolicy, setDeliveryPolicy] = useState(null);
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
  const pickAddress = useCallback((row, initial) => setForm(current => initial && current.address ? current : ({ ...current, fullName: row.receiver_name, phone: row.phone, address: [row.address_detail, row.ward, row.district, row.province].filter(Boolean).join(', ') })), []);

  const [manualCoupon, setManualCoupon] = useState(() => new URLSearchParams(location.search).get('coupon') ?? '');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [vnpayEnabled, setVnpayEnabled] = useState(false);
  const [momoEnabled, setMomoEnabled] = useState(false);
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

        const [cart, gateway, momo, policy] = await Promise.all([api.getCart(), api.getVnpayAvailability().catch(() => ({ enabled: false })), api.getMomoAvailability().catch(() => ({ enabled: false })), api.getSettings()]);
        if (active) setDeliveryPolicy(policy);
        if (active) setVnpayEnabled(gateway.enabled === true);
        if (active) setMomoEnabled(momo.enabled === true);
        const mapped = await Promise.all(selectedCartItems(cart?.cart_items ?? [], selectedCartIds)
          .map(async (item) => ({
            id: String(item.id), productId: Number(item.product_id), variantId: item.variant_id == null ? undefined : Number(item.variant_id),
            quantity: item.quantity, unitPrice: Number(item.product_variants?.price ?? item.products?.price ?? item.price),
            name: item.products?.name ?? 'Sản phẩm',
            product: await api.getProductById(item.product_id),
          })));

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
  }, [isAuthenticated, selectedCartIds]);

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
        const existing = map.get(String(coupon.id));
        map.set(String(coupon.id), { ...coupon, eligibleSubtotal: (existing?.eligibleSubtotal ?? 0) + item.unitPrice * item.quantity });
      });
    });
    return [...map.values()].filter((coupon) => isCouponApplicable(coupon, coupon.eligibleSubtotal));
  }, [items]);

  // Tự động chọn coupon tốt nhất (chỉ để hiển thị — backend xác nhận giá cuối)
  const bestCoupon = useMemo(() => {
    let best = null;
    let bestDiscount = -1;

    availableCoupons.forEach((coupon) => {
      if (coupon.discountType === 'FREE_SHIP') {
        const groups = new Map();
        items.forEach(item => {
          const key = String(item.product?.shop?.id ?? item.productId);
          const group = groups.get(key) ?? { subtotal: 0, eligible: false };
          group.subtotal += item.unitPrice * item.quantity;
          group.eligible ||= item.product?.coupons?.some(row => String(row.id) === String(coupon.id)) ?? false;
          groups.set(key, group);
        });
        const saving = [...groups.values()].filter(group => group.eligible && group.subtotal < Number(deliveryPolicy?.freeShippingThreshold ?? 0)).length * Number(deliveryPolicy?.shippingFee ?? 0);
        if (bestDiscount < saving) {
          best = coupon;
          bestDiscount = saving;
        }
        return;
      }

      const discount = calcCouponDiscount(coupon, coupon.eligibleSubtotal);
      if (discount > bestDiscount) {
        best = coupon;
        bestDiscount = discount;
      }
    });

    return best;
  }, [availableCoupons, items, deliveryPolicy]);

  const activeCoupon = useMemo(() => {
    if (selectedCouponId === 'none') return null;
    if (selectedCouponId === 'auto') return bestCoupon;

    return (
      availableCoupons.find(
        (coupon) => String(coupon.id) === selectedCouponId,
      ) ?? null
    );
  }, [selectedCouponId, bestCoupon, availableCoupons]);

  const couponCode = manualCoupon.trim() || activeCoupon?.code;
  const quoteKey = JSON.stringify([checkoutItems(items), couponCode]);
  const quoting = quote?.requestKey !== quoteKey;
  useEffect(() => {
    let active = true;
    if (!items.length) return;
    api.quoteOrder({ couponCode, items: checkoutItems(items) })
      .then((result) => { if (active) { setQuote({ ...result, requestKey: quoteKey }); setQuoteError(null); } })
      .catch((err) => { if (active) { setQuote(null); setQuoteError(err.message); } });
    return () => { active = false; };
  }, [items, couponCode, quoteKey]);

  const discount = Number(quote?.discount ?? 0);
  const shippingFee = Number(quote?.shippingFee ?? 0);
  const total = Number(quote?.total ?? 0);

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

    if (validationError || quoting || !quote || quoteError) return;

    try {
      setPlacing(true);

      const response = await api.placeOrder({
        customerName: form.fullName,
        phone: form.phone.replace(/\s/g, ''),
        address: form.address,
        paymentMethod,
        expectedTotal: Number(quote.total),
        couponCode,
        items: checkoutItems(items),
      });

      window.dispatchEvent(new CustomEvent('cart-changed'));

      // Lưu kết quả risk assessment tạm để trang success hiển thị
      if (response?.riskAssessment?.prediction) {
        sessionStorage.setItem(
          `risk_${response.id}`,
          JSON.stringify(response.riskAssessment.prediction),
        );
      }

      navigate(`/dat-hang-thanh-cong/${response.id}`, { state: { orderIds: response.orders?.map((order) => order.id) ?? [response.id] } });
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
          onClick={() => navigate('/dang-nhap')}
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
          onClick={() => navigate('/san-pham')}
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {quoteError && <div role="alert" className="alert alert-danger">{quoteError}</div>}
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
              <AddressPicker onSelect={pickAddress} />

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

              {['COD', ...(momoEnabled ? ['MOMO'] : []), ...(vnpayEnabled ? ['BANK_TRANSFER'] : [])].map((method) => (
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
                        ? 'Ví MoMo sandbox (thanh toán tại chi tiết đơn sau khi đặt)'
                        : 'Thanh toán VNPay (thực hiện tại chi tiết đơn sau khi đặt)'}
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
              <label className="form-label" htmlFor="loyalty-voucher">Mã phiếu ưu đãi (bao gồm ưu đãi thành viên)</label>
              <input id="loyalty-voucher" className="form-control mb-2" maxLength={50} value={manualCoupon} onChange={(event) => setManualCoupon(event.target.value)} placeholder="Nhập mã phiếu ưu đãi riêng của bạn" />
              <label className="form-label">Hoặc chọn phiếu ưu đãi sản phẩm</label>
              <select className="form-select mb-3" value={selectedCouponId} onChange={(event) => setSelectedCouponId(event.target.value)}>
                <option value="auto">Tự động chọn phiếu ưu đãi</option><option value="none">Không dùng phiếu ưu đãi</option>
                {availableCoupons.map((coupon) => <option key={coupon.id} value={String(coupon.id)}>{coupon.name}</option>)}
              </select>
              {quote?.groups?.length > 1 && <p className="small text-muted">Đơn được tách theo {quote.groups.length} cửa hàng.</p>}

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
                disabled={placing || quoting || !quote || Boolean(quoteError)}
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
