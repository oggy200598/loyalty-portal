import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../auth/useAuth';

const SUGGESTION_KEYWORDS = ['Dien thoai', 'Thoi trang', 'Gia dung', 'Dien tu', 'Lam dep'];

function normalizeText(value) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '---';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value));
}

function matchCategory(keyword, categories) {
  const normalized = normalizeText(keyword);
  return categories.find((category) => {
    const categoryName = normalizeText(category.name);
    return categoryName.includes(normalized) || normalized.includes(categoryName);
  });
}

function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Đếm giỏ hàng từ backend khi đã đăng nhập
  useEffect(() => {
    let active = true;

    if (!user) {
      setCartCount(0);
      return undefined;
    }

    api
      .getCart()
      .then((cart) => {
        if (active) {
          const count = (cart?.cart_items ?? []).reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
          setCartCount(count);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
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
      setSuggestions({ products: [], categories: [] });
      setShowDropdown(false);
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
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="rm-header">
      <div className="rm-topbar">
        <div className="rm-header-container">
          <div className="rm-top-left">
            {/* Seller/Admin chủ động mở Seller Portal — không tự động chuyển */}
            {(user?.role === 'SELLER' || user?.role === 'ADMIN') && (
              <>
                <Link to="/seller">Kênh Người Bán</Link>
                <span className="rm-divider">|</span>
              </>
            )}
            {!user?.role && (
              <>
                <Link to="/register">Trở thành Người bán</Link>
                <span className="rm-divider">|</span>
              </>
            )}
            <Link to="/notifications">
              <i className="bi bi-bell" />
              Thông báo
            </Link>
          </div>
          <div className="rm-top-right">
            {isAuthenticated ? (
              <>
                <Link to="/account">{user?.name ?? 'Tai khoan'}</Link>
                {user?.role === 'BUYER' && <Link to="/orders">Don hang</Link>}
                {user?.role === 'BUYER' && <Link to="/wishlist">Yeu thich</Link>}
                {user?.role === 'SELLER' && <Link to="/seller">Seller Portal</Link>}
                {user?.role === 'ADMIN' && <Link to="/admin">Admin Portal</Link>}
                <button
                  type="button"
                  className="rm-logout"
                  onClick={() => {
                    logout();
                    navigate('/login', { replace: true });
                  }}
                >
                  Dang xuat
                </button>
              </>
            ) : (
              <>
                <Link to="/register">Dang ky</Link>
                <span className="rm-divider">|</span>
                <Link to="/login">Dang nhap</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rm-mainbar">
        <div className="rm-header-container">
          <Link to="/" className="rm-brand"><div className="rm-logo">R</div><div className="rm-brand-text"><strong>RiskMind</strong><span>AI</span></div></Link>
          <div className="rm-search-wrapper">
            <form className="rm-search" onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
              <input type="text" placeholder="Tim kiem san pham, cua hang..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
              <button type="submit"><i className="bi bi-search" /></button>
            </form>
            {showDropdown && keyword.trim().length >= 2 ? (
              <div className="rm-search-dropdown">
                {suggestions.categories.length > 0 && <div className="rm-sd-group-label">Danh muc</div>}
                {suggestions.categories.map((category) => <Link key={category.id} to={`/categories/${category.id}`} className="rm-sd-item" onClick={() => setShowDropdown(false)}><i className="bi bi-grid" /><span className="rm-sd-name">{category.name}</span></Link>)}
                {suggestions.products.length > 0 && <div className="rm-sd-group-label">San pham</div>}
                {suggestions.products.map((product) => {
                  const image = product.images?.find((item) => item.isPrimary)?.imageUrl ?? product.images?.[0]?.imageUrl ?? '';
                  return <Link key={product.id} to={`/products/${product.id}`} className="rm-sd-item" onClick={() => setShowDropdown(false)}>{image ? <img src={image} alt="" className="rm-sd-thumb" /> : <div className="rm-sd-thumb-placeholder"><i className="bi bi-image" /></div>}<span className="rm-sd-name">{product.name}</span><span className="rm-sd-price">{formatCurrency(product.price)}</span></Link>;
                })}
                {suggestions.products.length === 0 && suggestions.categories.length === 0 && <div className="rm-sd-empty">Khong tim thay ket qua cho '{keyword.trim()}'</div>}
              </div>
            ) : null}
            <div className="rm-suggestions">
              {SUGGESTION_KEYWORDS.map((item) => {
                const category = matchCategory(item, categories);
                return <Link key={item} to={category ? `/categories/${category.id}` : '/products'}>{item}</Link>;
              })}
            </div>
          </div>
          <Link to="/cart" className="rm-cart">
            <i className="bi bi-cart3" />
            <span className="rm-cart-badge">{cartCount}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
