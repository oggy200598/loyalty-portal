import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../common/api';
import { useAuth } from '../accounts/authContext';
import { categoryPath, formatCurrency, normalizeText } from '../common/format';

const SUGGESTION_KEYWORDS = ["Điện thoại", "Thời trang", "Gia dụng", "Điện tử", "Làm đẹp"];

function matchCategory(keyword, categories) {
  const normalized = normalizeText(keyword);
  return categories.find((category) => {
    const categoryName = normalizeText(category.name);
    return categoryName.includes(normalized) || normalized.includes(categoryName);
  });
}

function Header({ settings }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, unreadCount = 0 } = useAuth();
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [cartSummary, setCartSummary] = useState({ ownerId: null, count: 0 });
  const cartCount = user?.id === cartSummary.ownerId ? cartSummary.count : 0;

  // Đếm giỏ hàng từ backend khi đã đăng nhập
  useEffect(() => {
    let active = true;

    if (!user) return undefined;
    const refresh = () => api.getCart().then((cart) => {
      if (active) setCartSummary({ ownerId: user.id, count: (cart?.cart_items ?? []).reduce((sum, item) => sum + item.quantity, 0) });
    }).catch(() => {});
    refresh();
    window.addEventListener('cart-changed', refresh);
    return () => { active = false; window.removeEventListener('cart-changed', refresh); };
  }, [user]);

  useEffect(() => {
    let active = true;
    api.getCategories().then((data) => {
      if (active) setCategories(Array.isArray(data) ? data : []);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const data = await api.getProducts(120);
        if (!active) return;
        const normalized = normalizeText(trimmed);
        setSuggestions({
          products: (Array.isArray(data) ? data : []).filter((product) => normalizeText(product.name).includes(normalized)).slice(0, 6),
          categories: categories.filter((category) => normalizeText(category.name).includes(normalized)).slice(0, 3),
        });
        setShowDropdown(true);
      } catch {
        if (active) setSuggestions({ products: [], categories: [] });
      }
    }, 300);

    return () => { active = false; clearTimeout(timer); };
  }, [keyword, categories]);

  function submitSearch() {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    navigate(`/tim-kiem?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="rm-header">
      <div className="rm-topbar">
        <div className="rm-header-container">
          <div className="rm-top-left">
            {/* Seller/Admin chủ động mở Seller Portal — không tự động chuyển */}
            {(user?.role === 'SELLER' || user?.role === 'ADMIN') && (
              <>
                <Link to="/nguoi-ban">Kênh Người Bán</Link>
                <span className="rm-divider">|</span>
              </>
            )}
            {!user?.role && (
              <>
                <Link to="/dang-ky">Trở thành Người bán</Link>
                <span className="rm-divider">|</span>
              </>
            )}
            <Link to="/thong-bao">
              <i className="bi bi-bell" />
              Thông báo
            </Link>
          </div>
          <div className="rm-top-right">
            {isAuthenticated ? (
              <>
                <Link to="/tai-khoan">{user?.name ?? "Tài khoản"}</Link>
                <Link to="/thong-bao" aria-label={`Thông báo, ${unreadCount} chưa đọc`}><i className="bi bi-bell" />{unreadCount > 0 && <span className="badge text-bg-danger ms-1">{unreadCount}</span>}</Link>
                {user?.role === 'BUYER' && <Link to="/khach-hang-than-thiet">Thành viên</Link>}
                {user?.role === 'BUYER' && <Link to="/don-hang">Đơn hàng</Link>}
                {user?.role === 'BUYER' && <Link to="/yeu-thich">Yêu thích</Link>}
                {user?.role === 'SELLER' && <Link to="/nguoi-ban">Kênh người bán</Link>}
                {user?.role === 'ADMIN' && <Link to="/quan-tri">Quản trị</Link>}
                <button
                  type="button"
                  className="rm-logout"
                  onClick={() => {
                    logout();
                    navigate('/dang-nhap', { replace: true });
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/dang-ky">Đăng ký</Link>
                <span className="rm-divider">|</span>
                <Link to="/dang-nhap">Đăng nhập</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rm-mainbar">
        <div className="rm-header-container">
          <Link to="/" className="rm-brand"><div className="rm-logo">{(settings?.storeName || 'R').charAt(0)}</div><div className="rm-brand-text"><strong>{settings?.storeName || 'RiskMind'}</strong></div></Link>
          <div className="rm-search-wrapper">
            <form className="rm-search" onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
              <input type="text" placeholder="Tìm kiếm sản phẩm, cửa hàng..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
              <button type="submit"><i className="bi bi-search" /></button>
            </form>
            {showDropdown && keyword.trim().length >= 2 ? (
              <div className="rm-search-dropdown">
                {suggestions.categories.length > 0 && <div className="rm-sd-group-label">Danh mục</div>}
                {suggestions.categories.map((category) => <Link key={category.id} to={categoryPath(category)} className="rm-sd-item" onClick={() => setShowDropdown(false)}><i className="bi bi-grid" /><span className="rm-sd-name">{category.name}</span></Link>)}
                {suggestions.products.length > 0 && <div className="rm-sd-group-label">Sản phẩm</div>}
                {suggestions.products.map((product) => {
                  const image = product.images?.find((item) => item.isPrimary)?.imageUrl ?? product.images?.[0]?.imageUrl ?? '';
                  return <Link key={product.id} to={`/san-pham/${product.id}`} className="rm-sd-item" onClick={() => setShowDropdown(false)}>{image ? <img src={image} alt="" className="rm-sd-thumb" /> : <div className="rm-sd-thumb-placeholder"><i className="bi bi-image" /></div>}<span className="rm-sd-name">{product.name}</span><span className="rm-sd-price">{formatCurrency(product.price)}</span></Link>;
                })}
                {suggestions.products.length === 0 && suggestions.categories.length === 0 && <div className="rm-sd-empty">Không tìm thấy kết quả cho '{keyword.trim()}'</div>}
              </div>
            ) : null}
            <div className="rm-suggestions">
              {SUGGESTION_KEYWORDS.map((item) => {
                const category = matchCategory(item, categories);
                return <Link key={item} to={category ? categoryPath(category) : '/san-pham'}>{item}</Link>;
              })}
            </div>
          </div>
          <Link to="/gio-hang" className="rm-cart">
            <i className="bi bi-cart3" />
            <span className="rm-cart-badge">{cartCount}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
