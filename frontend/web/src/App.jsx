import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { vietnamesePath } from './common/paths';

import { lazy, Suspense } from 'react';
const LoyaltyPage = lazy(() => import('./loyalty/LoyaltyPage'));
const AdminLoyaltyPage = lazy(() => import('./loyalty/AdminLoyaltyPage'));
import MainLayout from './shop/MainLayout';
const SellerLayout = lazy(() => import('./seller/SellerLayout'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
import { AuthProvider, ProtectedRoute } from './accounts/AuthProvider';

// ===== BUYER / PUBLIC pages =====
import HomePage from './shop/HomePage';
const ProductDetail = lazy(() => import('./shop/ProductDetail'));
const ProductsPage = lazy(() => import('./shop/ProductsPage'));
import LoginPage from './accounts/LoginPage';
const RegisterPage = lazy(() => import('./accounts/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./accounts/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./accounts/ForgotPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const ChangePasswordPage = lazy(() => import('./accounts/ForgotPasswordPage').then(module => ({ default: module.ChangePasswordPage })));
const CategoryPage = lazy(() => import('./shop/CategoryPage'));
const SearchPage = lazy(() => import('./shop/SearchPage'));
const ShopsPage = lazy(() => import('./shop/ShopsPage'));
const ShopDetailPage = lazy(() => import('./shop/ShopDetailPage'));
const FlashSalePage = lazy(() => import('./shop/FlashSalePage'));
const CouponsPage = lazy(() => import('./shop/CouponsPage'));
const CartPage = lazy(() => import('./shop/CartPage'));
const CheckoutPage = lazy(() => import('./shop/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./shop/OrderSuccessPage'));
const OrdersPage = lazy(() => import('./shop/OrdersPage'));
const OrderDetailPage = lazy(() => import('./shop/OrderDetailPage'));
const WishlistPage = lazy(() => import('./accounts/WishlistPage'));
const NotificationsPage = lazy(() => import('./accounts/NotificationsPage'));
const AccountPage = lazy(() => import('./accounts/AccountPage'));
const NotFoundPage = lazy(() => import('./common/NotFoundPage'));
const ForbiddenPage = lazy(() => import('./common/ForbiddenPage'));

// ===== SELLER PORTAL =====
const SellerHomePage = lazy(() => import('./seller/SellerHomePage'));
const SellerProductsPage = lazy(() => import('./seller/SellerProductsPage'));
const SellerOrdersPage = lazy(() => import('./seller/SellerOrdersPage'));
const SellerOrderDetailPage = lazy(() => import('./seller/SellerOrderDetailPage'));
const SellerCouponsPage = lazy(() => import('./seller/SellerCouponsPage'));
const SellerAnalyticsPage = lazy(() => import('./seller/SellerAnalyticsPage'));
const SellerRiskPage = lazy(() => import('./seller/SellerRiskPage'));
const SellerSettingsPage = lazy(() => import('./seller/SellerSettingsPage'));

// ===== ADMIN PORTAL =====
const AdminHomePage = lazy(() => import('./admin/AdminHomePage'));
const AdminUsersPage = lazy(() => import('./admin/AdminUsersPage'));
const AdminSellersPage = lazy(() => import('./admin/AdminSellersPage'));
const AdminShopsPage = lazy(() => import('./admin/AdminShopsPage'));
const AdminCategoriesPage = lazy(() => import('./admin/AdminCategoriesPage'));
const AdminProductsPage = lazy(() => import('./admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('./admin/AdminOrdersPage'));
const AdminCouponsPage = lazy(() => import('./admin/AdminCouponsPage'));
const AdminRiskPage = lazy(() => import('./admin/AdminRiskPage'));
const AdminModelsPage = lazy(() => import('./admin/AdminModelsPage'));
const AdminRecommendationsPage = lazy(() => import('./admin/AdminRecommendationsPage'));
const AdminAuditLogsPage = lazy(() => import('./admin/AdminAuditLogsPage'));
const AdminSettingsPage = lazy(() => import('./admin/AdminSettingsPage'));

function LegacyRoute() {
  const location = useLocation();
  const pathname = vietnamesePath(location.pathname);
  return pathname === location.pathname ? <NotFoundPage />
    : <Navigate to={`${pathname}${location.search}${location.hash}`} state={location.state} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<p className="container py-4" role="status">Đang tải trang...</p>}>
        <Routes>
          {/* ============ PUBLIC ============ */}
          <Route path="/dat-lai-mat-khau" element={<ResetPasswordPage />} />
          <Route path="/tai-khoan/mat-khau" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/khong-co-quyen" element={<ForbiddenPage />} />

          {/* ============ BUYER PORTAL (MainLayout) ============ */}
          <Route element={<MainLayout />}>
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/san-pham" element={<ProductsPage />} />
            <Route path="/san-pham/:id" element={<ProductDetail />} />
            <Route path="/danhmuc/:id" element={<CategoryPage />} />
            <Route path="/tim-kiem" element={<SearchPage />} />
            <Route path="/cua-hang" element={<ShopsPage />} />
            <Route path="/cua-hang/:id" element={<ShopDetailPage />} />
            <Route path="/gio-vang" element={<FlashSalePage />} />
            <Route path="/ma-giam-gia" element={<CouponsPage />} />
            <Route path="/khach-hang-than-thiet" element={<ProtectedRoute roles={['BUYER']}><Suspense fallback={<p className="container py-4">Đang tải chương trình thành viên...</p>}><LoyaltyPage /></Suspense></ProtectedRoute>} />

            <Route
              path="/gio-hang"
              element={<ProtectedRoute roles={['BUYER']}><CartPage /></ProtectedRoute>}
            />
            <Route
              path="/thanh-toan"
              element={<ProtectedRoute roles={['BUYER']}><CheckoutPage /></ProtectedRoute>}
            />
            <Route
              path="/dat-hang-thanh-cong/:id"
              element={<ProtectedRoute roles={['BUYER']}><OrderSuccessPage /></ProtectedRoute>}
            />
            <Route
              path="/don-hang"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><OrdersPage /></ProtectedRoute>}
            />
            <Route
              path="/don-hang/:id"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><OrderDetailPage /></ProtectedRoute>}
            />
            <Route
              path="/yeu-thich"
              element={<ProtectedRoute roles={['BUYER']}><WishlistPage /></ProtectedRoute>}
            />
            <Route
              path="/thong-bao"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><NotificationsPage /></ProtectedRoute>}
            />
            <Route
              path="/tai-khoan"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><AccountPage /></ProtectedRoute>}
            />
            <Route
              path="/tai-khoan/ho-so"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><AccountPage /></ProtectedRoute>}
            />
            <Route
              path="/tai-khoan/dia-chi"
              element={<ProtectedRoute roles={['BUYER', 'SELLER', 'ADMIN']}><AccountPage /></ProtectedRoute>}
            />
          </Route>

          {/* ============ SELLER PORTAL (SellerLayout) ============ */}
          <Route
            path="/nguoi-ban"
            element={
              <ProtectedRoute roles={['SELLER']}>
                <SellerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SellerHomePage />} />
            <Route path="san-pham" element={<SellerProductsPage />} />
            <Route path="san-pham/them-moi" element={<SellerProductsPage />} />
            <Route path="san-pham/:id/chinh-sua" element={<SellerProductsPage />} />
            <Route path="don-hang" element={<SellerOrdersPage />} />
            <Route path="don-hang/:id" element={<SellerOrderDetailPage />} />
            <Route path="ma-giam-gia" element={<SellerCouponsPage />} />
            <Route path="phan-tich" element={<SellerAnalyticsPage />} />
            <Route path="rui-ro" element={<SellerRiskPage />} />
            <Route path="cai-dat" element={<SellerSettingsPage />} />
          </Route>

          {/* ============ ADMIN PORTAL (AdminLayout) ============ */}
          <Route
            path="/quan-tri"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminHomePage />} />
            <Route path="khach-hang-than-thiet" element={<Suspense fallback={<p>Đang tải quản trị thành viên...</p>}><AdminLoyaltyPage /></Suspense>} />
            <Route path="tai-khoan" element={<AdminUsersPage />} />
            <Route path="nguoi-ban" element={<AdminSellersPage />} />
            <Route path="cua-hang" element={<AdminShopsPage />} />
            <Route path="danh-muc" element={<AdminCategoriesPage />} />
            <Route path="san-pham" element={<AdminProductsPage />} />
            <Route path="don-hang" element={<AdminOrdersPage />} />
            <Route path="ma-giam-gia" element={<AdminCouponsPage />} />
            <Route path="rui-ro" element={<AdminRiskPage />} />
            <Route path="mo-hinh" element={<AdminModelsPage />} />
            <Route path="de-xuat" element={<AdminRecommendationsPage />} />
            <Route path="nhat-ky" element={<AdminAuditLogsPage />} />
            <Route path="cai-dat" element={<AdminSettingsPage />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/nguoi-ban/tong-quan" element={<Navigate to="/nguoi-ban" replace />} />
          <Route path="/nguoi-ban/xu-ly-rui-ro" element={<Navigate to="/nguoi-ban/rui-ro" replace />} />

          <Route path="*" element={<LegacyRoute />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
