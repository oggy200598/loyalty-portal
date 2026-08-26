import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../auth/useAuth';
import { formatCurrency, formatSold } from '../utils/format';

function WishlistPage() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    if (!isAuthenticated) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const wishlist = await api.getWishlist();
      const items = wishlist?.wishlist_items ?? [];

      // Lấy chi tiết từng sản phẩm (bỏ qua item lỗi)
      const loaded = await Promise.all(
        items.map((item) =>
          api
            .getProductById(String(item.product_id))
            .catch(() => null),
        ),
      );

      setProducts(loaded.filter(Boolean));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách yêu thích',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function handleRemove(productId) {
    try {
      await api.removeFromWishlist(String(productId));
    } catch {
      /* bỏ qua */
    }
    setProducts((prev) =>
      prev.filter((product) => String(product.id) !== String(productId)),
    );
  }

  async function handleAddToCart(product) {
    try {
      await api.addCartItem(
        Number(product.id),
        1,
        product.variants?.[0]?.id ? Number(product.variants[0].id) : undefined,
      );
    } catch {
      /* bỏ qua */
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-lock" style={{ fontSize: 56, color: '#ddd' }} />
        <h1 className="h5 mt-3">Vui lòng đăng nhập để xem yêu thích</h1>
        <Link
          to="/login"
          className="btn text-white px-4 mt-3"
          style={{ background: '#ee4d2d' }}
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="h5 fw-bold mb-3">
        <i className="bi bi-heart-fill me-2" style={{ color: '#ee4d2d' }} />
        Sản phẩm yêu thích ({products.length})
      </h1>

      {loading ? (
        <div className="text-center py-5 text-muted">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-5 text-danger">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-3 border">
          <i className="bi bi-heart" style={{ fontSize: 48, color: '#ddd' }} />
          <p className="text-muted mt-3 mb-2">Chưa có sản phẩm yêu thích nào</p>
          <Link
            to="/products"
            className="btn text-white px-4"
            style={{ background: '#ee4d2d' }}
          >
            Khám phá ngay
          </Link>
        </div>
      ) : (
        <div className="row g-3">
          {products.map((product) => (
            <div key={String(product.id)} className="col-6 col-md-4 col-lg-3">
              <div
                className="bg-white rounded-3 border overflow-hidden h-100 d-flex flex-column"
                style={{ borderColor: '#f1f1f1' }}
              >
                <Link to={`/products/${product.id}`} className="text-decoration-none">
                  <div
                    className="position-relative"
                    style={{ aspectRatio: '1', background: '#fafafa' }}
                  >
                    {product.images?.[0]?.imageUrl ? (
                      <img
                        src={product.images[0].imageUrl}
                        alt={product.name}
                        className="w-100 h-100 object-fit-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                </Link>

                <div className="p-2 d-flex flex-column flex-grow-1">
                  <Link
                    to={`/products/${product.id}`}
                    className="text-dark text-decoration-none small mb-1"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {product.name}
                  </Link>

                  <span className="fw-bold" style={{ color: '#ee4d2d' }}>
                    {formatCurrency(Number(product.price))}
                  </span>

                  <small className="text-muted mb-2">
                    Đã bán {formatSold(product.soldQuantity)}
                  </small>

                  <div className="mt-auto d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm flex-grow-1 text-white"
                      style={{ background: '#ee4d2d' }}
                      onClick={() => handleAddToCart(product)}
                    >
                      🛒 Thêm
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleRemove(product.id)}
                      title="Xóa khỏi yêu thích"
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;
