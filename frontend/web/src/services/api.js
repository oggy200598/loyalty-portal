const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
function getToken() {
  return localStorage.getItem('accessToken');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

export const api = {
  login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  forgotPassword(payload) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  me() {
    return request('/auth/me');
  },

  getProducts(limit = 36) {
    return request(`/products?limit=${limit}`);
  },

  getCategories() {
    return request('/categories');
  },

  getStatisticsOverview() {
    return request('/statistics/overview');
  },

  getRiskOverview() {
    return request('/risk/overview');
  },

  getLatestRisk() {
    return request('/risk/latest');
  },

  getLatestRiskByBuyerId(buyerId) {
    return request(`/risk/latest/${buyerId}`);
  },

  /** Risk assessment theo ORDER — seller chỉ xem risk của đơn thuộc shop mình. */
  getRiskForOrder(orderId) {
    return request(`/risk/orders/${orderId}`);
  },

  getLatestRecommendation() {
    return request('/recommendations/latest');
  },
  getProductById(id) {
    return request(`/products/${id}`);
  },

  getProductsByCategory(categoryId) {
    return request(
      `/categories/${categoryId}/products`,
    );
  },

  getShops() {
    return request('/shops');
  },

  getShopById(id) {
    return request(`/shops/${id}`);
  },

  getProductsByShop(shopId) {
    return request(`/shops/${shopId}/products`);
  },

  // Flash Sale
  getFlashSaleProducts(limit = 12) {
    return request(`/products/flash-sale?limit=${limit}`);
  },

  // ===== CART (backend) =====
  getCart() {
    return request('/cart');
  },

  addCartItem(productId, quantity, variantId = undefined) {
    return request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, variantId }),
    });
  },

  updateCartItem(itemId, quantity) {
    return request(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  removeCartItem(itemId) {
    return request(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  clearCart() {
    return request('/cart', { method: 'DELETE' });
  },

  // ===== ORDERS =====
  placeOrder(payload) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getOrders(page = 1, limit = 20, status = undefined) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return request(`/orders?${params.toString()}`);
  },

  getOrderById(id) {
    return request(`/orders/${id}`);
  },

  updateOrderStatus(orderId, status) {
    return request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // ===== WISHLIST =====
  getWishlist() {
    return request('/wishlist');
  },

  addToWishlist(productId) {
    return request('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId: String(productId) }),
    });
  },

  removeFromWishlist(productId) {
    return request(`/wishlist/${productId}`, {
      method: 'DELETE',
    });
  },

  // ===== NOTIFICATIONS =====
  getNotifications(page = 1, limit = 20) {
    return request(`/notifications?page=${page}&limit=${limit}`);
  },

  markNotificationRead(id) {
    return request(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAllNotificationsRead() {
    return request('/notifications/read-all', { method: 'PATCH' });
  },

  // ===== RECOMMENDATIONS (seller/admin) =====
  getRecommendations() {
    return request('/recommendations');
  },

  createRecommendationAction(recommendationId, decision, note = undefined) {
    return request(`/recommendations/${recommendationId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    });
  },

  // ===== SELLER PORTAL =====
  getSellerStats() {
    return request('/seller/stats');
  },

  getSellerProducts() {
    return request('/seller/products');
  },

  // ===== ADMIN PORTAL (ADMIN only — backend chặn bằng RolesGuard) =====
  getAdminOverview() {
    return request('/admin/overview');
  },

  getAdminUsers() {
    return request('/admin/users');
  },

  getAdminSellers() {
    return request('/admin/sellers');
  },

  getAdminShops() {
    return request('/admin/shops');
  },

  getAdminAuditLogs(limit = 50) {
    return request(`/admin/audit-logs?limit=${limit}`);
  },

  getAdminModels() {
    return request('/admin/models');
  },

  /** Mã giảm giá (coupons) — ADMIN/SELLER. */
  getCoupons() {
    return request('/coupons');
  },
};
