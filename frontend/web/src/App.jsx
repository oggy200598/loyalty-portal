import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './layouts/MainLayout';
import SellerLayout from './layouts/SellerLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/routing/ProtectedRoute';
import { AuthProvider } from './auth/AuthProvider';

// ===== BUYER / PUBLIC pages =====
import HomePage from './pages/HomePage';
import ProductDetail from './pages/product/ProductDetail';
import ProductsPage from './pages/product/ProductsPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import CategoryPage from './pages/category/CategoryPage';
import SearchPage from './pages/search/SearchPage';
import ShopsPage from './pages/shop/ShopsPage';
import ShopDetailPage from './pages/shop/ShopDetailPage';
import FlashSalePage from './pages/FlashSalePage';
import CouponsPage from './pages/CouponsPage';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/cart/CheckoutPage';
import OrderSuccessPage from './pages/order/OrderSuccessPage';
import OrdersPage from './pages/order/OrdersPage';
import OrderDetailPage from './pages/order/OrderDetailPage';
import WishlistPage from './pages/WishlistPage';
import NotificationsPage from './pages/NotificationsPage';
import AccountPage from './pages/account/AccountPage';
import NotFoundPage from './pages/NotFoundPage';
import ForbiddenPage from './pages/ForbiddenPage';

// ===== SELLER PORTAL =====
import SellerHomePage from './pages/seller/SellerHomePage';
import SellerProductsPage from './pages/seller/SellerProductsPage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import SellerOrderDetailPage from './pages/seller/SellerOrderDetailPage';
import SellerCouponsPage from './pages/seller/SellerCouponsPage';
import SellerAnalyticsPage from './pages/seller/SellerAnalyticsPage';
import SellerRiskPage from './pages/seller/SellerRiskPage';
import SellerSettingsPage from './pages/seller/SellerSettingsPage';

// ===== ADMIN PORTAL =====
import AdminHomePage from './pages/admin/AdminHomePage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSellersPage from './pages/admin/AdminSellersPage';
import AdminShopsPage from './pages/admin/AdminShopsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminRiskPage from './pages/admin/AdminRiskPage';
import AdminModelsPage from './pages/admin/AdminModelsPage';
import AdminRecommendationsPage from './pages/admin/AdminRecommendationsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ============ PUBLIC ============ */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* ============ BUYER PORTAL (MainLayout) ============ */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/categories/:id" element={<CategoryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/shops" element={<ShopsPage />} />
            <Route path="/shops/:id" element={<ShopDetailPage />} />
            <Route path="/flash-sale" element={<FlashSalePage />} />
            <Route path="/coupons" element={<CouponsPage />} />

            <Route
              path="/cart"
              element={<ProtectedRoute roles={['BUYER']}><CartPage /></ProtectedRoute>}
            />
            <Route
              path="/checkout"
              element={<ProtectedRoute roles={['BUYER']}><CheckoutPage /></ProtectedRoute>}
            />
            <Route
              path="/order-success/:id"
              element={<ProtectedRoute roles={['BUYER']}><OrderSuccessPage /></ProtectedRoute>}
            />
            <Route
              path="/orders"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><OrdersPage /></ProtectedRoute>}
            />
            <Route
              path="/orders/:id"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><OrderDetailPage /></ProtectedRoute>}
            />
            <Route
              path="/wishlist"
              element={<ProtectedRoute roles={['BUYER']}><WishlistPage /></ProtectedRoute>}
            />
            <Route
              path="/notifications"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><NotificationsPage /></ProtectedRoute>}
            />
            <Route
              path="/account"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><AccountPage /></ProtectedRoute>}
            />
            <Route
              path="/account/profile"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><AccountPage /></ProtectedRoute>}
            />
            <Route
              path="/account/addresses"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><AccountPage /></ProtectedRoute>}
            />
          </Route>

          {/* ============ SELLER PORTAL (SellerLayout) ============ */}
          <Route
            path="/seller"
            element={
              <ProtectedRoute roles={['SELLER']}>
                <SellerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SellerHomePage />} />
            <Route path="products" element={<SellerProductsPage />} />
            <Route path="products/new" element={<SellerProductsPage />} />
            <Route path="products/:id/edit" element={<SellerProductsPage />} />
            <Route path="orders" element={<SellerOrdersPage />} />
            <Route path="orders/:id" element={<SellerOrderDetailPage />} />
            <Route path="coupons" element={<SellerCouponsPage />} />
            <Route path="analytics" element={<SellerAnalyticsPage />} />
            <Route path="risk" element={<SellerRiskPage />} />
            <Route path="settings" element={<SellerSettingsPage />} />
          </Route>

          {/* ============ ADMIN PORTAL (AdminLayout) ============ */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminHomePage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="sellers" element={<AdminSellersPage />} />
            <Route path="shops" element={<AdminShopsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="risk" element={<AdminRiskPage />} />
            <Route path="models" element={<AdminModelsPage />} />
            <Route path="recommendations" element={<AdminRecommendationsPage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/seller/dashboard" element={<Navigate to="/seller" replace />} />
          <Route path="/seller/risk-actions" element={<Navigate to="/seller/risk" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
