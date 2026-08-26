import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../auth/useAuth';
import {
  formatCurrency,
  formatSold,
} from '../../utils/format';

function getCouponLabel(coupon) {
  if (coupon.discountType === 'FREE_SHIP') {
    return 'FREESHIP';
  }

  if (coupon.discountType === 'PERCENT') {
    return `Giảm ${coupon.discountValue}%`;
  }

  if (coupon.discountType === 'FIXED') {
    return `Giảm ${formatCurrency(coupon.discountValue)}`;
  }

  return 'Ưu đãi';
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [cartStatus, setCartStatus] = useState(null);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getProductById(id);

        if (!active) return;

        setProduct(data);

        if (
          Array.isArray(data?.variants) &&
          data.variants.length > 0
        ) {
          setSelectedVariant(data.variants[0]);
        }
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải sản phẩm',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  // Kiểm tra sản phẩm có trong wishlist không
  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .getWishlist()
      .then((wishlist) => {
        const items = wishlist?.wishlist_items ?? [];
        setWishlisted(
          items.some(
            (item) => String(item.product_id) === String(id),
          ),
        );
      })
      .catch(() => {});
  }, [id, isAuthenticated]);

  const images = product?.images ?? [];
  const variants = product?.variants ?? [];
  const coupons = product?.coupons ?? [];

  const currentStock = selectedVariant
    ? Number(selectedVariant.stockQuantity ?? 0)
    : Number(product?.stockQuantity ?? 0);

  const currentPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product?.price ?? 0);

  const priceRange = useMemo(() => {
    if (variants.length === 0) {
      return null;
    }

    const prices = variants
      .map((variant) => Number(variant.price))
      .filter((price) => Number.isFinite(price));

    if (prices.length === 0) {
      return null;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return {
      min,
      max,
      same: min === max,
    };
  }, [variants]);

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1),
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(
        currentStock > 0 ? currentStock : 1,
        current + 1,
      ),
    );
  }

  function selectVariant(variant) {
    setSelectedVariant(variant);
    setQuantity(1);
  }

  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setCartStatus('adding');
      await api.addCartItem(Number(id), quantity, selectedVariant ? Number(selectedVariant.id) : undefined);
      setCartStatus('added');
      setTimeout(() => setCartStatus(null), 2000);
    } catch {
      setCartStatus('error');
      setTimeout(() => setCartStatus(null), 2500);
    }
  }

  async function handleBuyNow() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setCartStatus('adding');
      await api.addCartItem(Number(id), quantity, selectedVariant ? Number(selectedVariant.id) : undefined);
      setCartStatus('added');
      navigate('/checkout');
    } catch {
      setCartStatus('error');
      setTimeout(() => setCartStatus(null), 2500);
    }
  }

  async function handleToggleWishlist() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      if (wishlisted) {
        await api.removeFromWishlist(String(id));
        setWishlisted(false);
      } else {
        await api.addToWishlist(String(id));
        setWishlisted(true);
      }
    } catch {
      /* bỏ qua */
    }
  }

  function previousImage() {
    if (images.length <= 1) return;

    setActiveImage((current) =>
      current === 0
        ? images.length - 1
        : current - 1,
    );
  }

  function nextImage() {
    if (images.length <= 1) return;

    setActiveImage((current) =>
      current === images.length - 1
        ? 0
        : current + 1,
    );
  }

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">
        Đang tải sản phẩm...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-package" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">{error ?? 'Không tìm thấy sản phẩm'}</h1>
        <Link
          to="/products"
          className="btn text-white px-4 mt-3"
          style={{ background: '#ee4d2d' }}
        >
          Xem sản phẩm khác
        </Link>
      </div>
    );
  }

  const mainImage =
    images[activeImage]?.imageUrl ??
    images[0]?.imageUrl ??
    '';

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav className="mb-3 small">
        <Link to="/" className="text-decoration-none text-muted">Trang chủ</Link>
        <span className="mx-2 text-muted">›</span>
        <span className="text-muted">{product.category?.name ?? 'Danh mục'}</span>
        <span className="mx-2 text-muted">›</span>
        <span className="text-dark">{product.name}</span>
      </nav>

      <div className="row g-4">
        {/* Gallery */}
        <div className="col-lg-6">
          <div
            className="rounded-3 overflow-hidden mb-2 d-flex align-items-center justify-content-center"
            style={{ aspectRatio: '1', background: '#fafafa' }}
          >
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="w-100 h-100 object-fit-cover"
              />
            ) : (
              <span className="text-muted">Chưa có ảnh</span>
            )}
          </div>

          {images.length > 1 && (
            <div className="d-flex gap-2 flex-wrap">
              {images.map((image, index) => (
                <button
                  key={image.id ?? index}
                  type="button"
                  className={`rounded-2 overflow-hidden border ${
                    activeImage === index ? 'border-danger border-2' : ''
                  }`}
                  style={{ width: 60, height: 60, padding: 0, background: '#fafafa' }}
                  onClick={() => setActiveImage(index)}
                >
                  <img src={image.imageUrl} alt="" className="w-100 h-100 object-fit-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="col-lg-6">
          <h1 className="h4 fw-bold">{product.name}</h1>

          <div className="small text-muted mb-3">
            <span className="me-2">
              Đã bán {formatSold(product.soldQuantity)}
            </span>
            <span className="badge text-bg-light border">Yêu thích</span>
          </div>

          <div className="mb-3">
            <span className="fw-bold" style={{ color: '#ee4d2d', fontSize: 28 }}>
              {formatCurrency(currentPrice)}
            </span>
          </div>

          {/* Coupons */}
          {coupons.length > 0 && (
            <div className="mb-3">
              <small className="text-muted d-block mb-1">Voucher của shop</small>
              <div className="d-flex flex-wrap gap-2">
                {coupons.slice(0, 5).map((coupon) => (
                  <span
                    key={coupon.id}
                    className="badge rounded-pill"
                    style={{
                      background: coupon.discountType === 'FREE_SHIP' ? '#e0f2fe' : '#fff3ef',
                      color: coupon.discountType === 'FREE_SHIP' ? '#02b2fa' : '#ee4d2d',
                      border: `1px solid ${coupon.discountType === 'FREE_SHIP' ? '#02b2fa' : '#ee4d2d'}`,
                    }}
                    title={`${coupon.name} — đơn từ ${formatCurrency(coupon.minOrderValue)}`}
                  >
                    {getCouponLabel(coupon)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <div className="mb-3">
              <small className="text-muted d-block mb-1">Phân loại</small>
              <div className="d-flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const stock = Number(variant.stockQuantity ?? 0);
                  const disabled = stock <= 0;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={disabled}
                      className={`btn btn-sm ${
                        selectedVariant?.id === variant.id
                          ? 'text-white'
                          : 'btn-outline-secondary'
                      }`}
                      style={
                        selectedVariant?.id === variant.id
                          ? { background: '#ee4d2d', borderColor: '#ee4d2d' }
                          : undefined
                      }
                      onClick={() => !disabled && selectVariant(variant)}
                    >
                      {variant.variantName}
                      {disabled ? ' (Hết hàng)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-3 d-flex align-items-center gap-3">
            <small className="text-muted">Số lượng</small>

            <div className="input-group input-group-sm" style={{ width: 130 }}>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
              >
                −
              </button>

              <input type="text" className="form-control text-center" value={quantity} readOnly />

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={increaseQuantity}
                disabled={currentStock <= 0 || quantity >= currentStock}
              >
                +
              </button>
            </div>

            <small className="text-muted">{currentStock} có sẵn</small>
          </div>

          {/* Actions */}
          <div className="d-flex gap-2 mb-4">
            <button
              type="button"
              className="btn btn-lg flex-grow-1"
              style={{ border: '1.5px solid #ee4d2d', color: '#ee4d2d' }}
              disabled={cartStatus === 'adding' || currentStock <= 0}
              onClick={handleAddToCart}
            >
              {cartStatus === 'adding'
                ? 'Đang thêm...'
                : cartStatus === 'added'
                  ? '✓ Đã thêm vào giỏ'
                  : cartStatus === 'error'
                    ? 'Lỗi — thử lại'
                    : '🛒 Thêm vào giỏ hàng'}
            </button>

            <button
              type="button"
              className="btn btn-lg flex-grow-1 text-white"
              style={{ background: '#ee4d2d' }}
              disabled={cartStatus === 'adding' || currentStock <= 0}
              onClick={handleBuyNow}
            >
              Mua ngay
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleToggleWishlist}
              title={wishlisted ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
            >
              {wishlisted ? '♥' : '♡'}
            </button>
          </div>

          {/* Shop info */}
          <div
            className="bg-white rounded-3 border p-3 d-flex align-items-center gap-3"
            style={{ borderColor: '#f1f1f1' }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
              style={{ width: 48, height: 48, background: '#ee4d2d', fontSize: 20 }}
            >
              {product.shop?.name?.charAt(0)?.toUpperCase() ?? 'S'}
            </div>

            <div>
              <div className="fw-semibold small">{product.shop?.name ?? 'Cửa hàng'}</div>
              <small className="text-muted">● Đang hoạt động</small>
            </div>

            <Link
              to={`/shops/${product.shop?.id}`}
              className="btn btn-sm btn-outline-secondary ms-auto"
            >
              🏪 Xem shop
            </Link>
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        className="bg-white rounded-3 border p-4 mt-4"
        style={{ borderColor: '#f1f1f1' }}
      >
        <h2 className="h6 fw-bold mb-3">CHI TIẾT SẢN PHẨM</h2>

        <div className="small text-muted" style={{ whiteSpace: 'pre-line' }}>
          {product.description ?? 'Chưa có mô tả sản phẩm.'}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
