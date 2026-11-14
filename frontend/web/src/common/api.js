const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? '/api';
export function mediaUrl(value) {
  return typeof value === 'string' && value.startsWith('/media/products/')
    ? `${API_BASE_URL.replace(/\/$/, '')}${value}` : value;
}
function resolveImages(value) {
  if (Array.isArray(value)) return value.map(resolveImages);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, key === 'imageUrl' ? mediaUrl(entry) : resolveImages(entry)]));
  return value;
}
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

  let response;
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers }); }
  catch { throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'); }

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try { const parsed = JSON.parse(body); message = Array.isArray(parsed.message) ? parsed.message.join(' ') : parsed.message || body; } catch { /* Non-JSON error response. */ }
    const legacy = { 'Invalid credentials': 'Tên tài khoản hoặc mật khẩu không đúng.', 'Insufficient role': 'Bạn không có quyền thực hiện thao tác này.', 'Invalid or expired access token': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' };
    message = legacy[message] ?? message;
    const fallback = { 400: 'Thông tin gửi lên không hợp lệ.', 401: 'Vui lòng đăng nhập lại để tiếp tục.', 403: 'Bạn không có quyền thực hiện thao tác này.', 404: 'Không tìm thấy thông tin yêu cầu.', 409: 'Dữ liệu đã thay đổi. Vui lòng tải lại và kiểm tra.', 429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', 503: 'Dịch vụ tạm thời chưa sẵn sàng.' };
    const safeMessage = /[À-ỹĐđ]/u.test(message) && !/<[a-z][^>]*>/i.test(message) ? message : fallback[response.status] ?? 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.';
    const error = new Error(safeMessage);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  try { return resolveImages(await response.json()); }
  catch { throw new Error('Dữ liệu máy chủ trả về không hợp lệ. Vui lòng thử lại.'); }
}

function loyaltyQuery(page, limit, filters = {}) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  return query.toString();
}

export const api = {
  resetPassword(payload) { return request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }); },
  changePassword(payload) { return request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }); },
  cancelOwnOrder(id, expectedStatus) { return request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ expectedStatus }) }); },
  watchNotifications(onSnapshot, onExpired = () => {}) {
    const controller = new AbortController();
    let retry;
    const token = getToken();
    const connect = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (response.status === 401) { if (!controller.signal.aborted) onExpired(); return; }
        if (!response.ok || !response.body) throw new Error('Stream unavailable');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n'); buffer = lines.pop();
            for (const line of lines) if (line.startsWith('data:')) {
              const data = JSON.parse(line.slice(5).trim());
              if (!controller.signal.aborted && typeof data.unreadCount === 'number') onSnapshot(data);
            }
          }
        } finally { await reader.cancel().catch(() => {}); }
      } catch { /* Reconnect after temporary network loss. */ }
      if (!controller.signal.aborted) retry = setTimeout(connect, 2000);
    };
    connect();
    return () => { controller.abort(); clearTimeout(retry); };
  },
  getSettings() { return request('/settings'); },
  saveSettings(payload) { return request('/admin/settings', { method: 'PATCH', body: JSON.stringify(payload) }); },
  getAddresses() { return request('/users/me/addresses'); },
  saveAddress(id, payload) { return request(`/users/me/addresses${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); },
  deleteAddress(id, version) { return request(`/users/me/addresses/${id}?version=${version}`, { method: 'DELETE' }); },
  getAdminOrders(page = 1, filters = {}) { return request(`/orders?${new URLSearchParams({ page: String(page), limit: '20', ...filters })}`); },
  getProfile() { return request('/users/me'); },
  updateProfile(payload) { return request('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }); },
  getMomoAvailability() { return request('/payments/momo/availability'); },
  createMomoPayment(id) { return request(`/payments/momo/orders/${id}`, { method: 'POST' }); },
  getVnpayAvailability() { return request('/payments/vnpay/availability'); },
  createVnpayPayment(id) { return request(`/payments/vnpay/orders/${id}`, { method: 'POST' }); },
  getLoyaltySummary() { return request('/loyalty/me'); },
  enrollLoyalty() { return request('/loyalty/enroll', { method: 'POST' }); },
  getLoyaltyTransactions(page = 1, filters) { return request(`/loyalty/transactions?${loyaltyQuery(page, 20, filters)}`); },
  getLoyaltyRewards() { return request('/loyalty/rewards'); },
  redeemLoyaltyReward(rewardId, idempotencyKey) { return request('/loyalty/redemptions', { method: 'POST', body: JSON.stringify({ rewardId: String(rewardId), idempotencyKey }) }); },
  getLoyaltyRedemptions(page = 1) { return request(`/loyalty/redemptions?page=${page}&limit=20`); },
  getLoyaltyComplaints(page = 1, filters) { return request(`/loyalty/complaints?${loyaltyQuery(page, 20, filters)}`); },
  createLoyaltyComplaint(payload) { return request('/loyalty/complaints', { method: 'POST', body: JSON.stringify(payload) }); },
  getAdminLoyalty(section, page = 1, filters) { return request(`/admin/loyalty/${section}?${loyaltyQuery(page, 50, filters)}`); },
  getLoyaltyCharts() { return request('/loyalty/charts'); },
  getAdminLoyaltyMember(id) { return request(`/admin/loyalty/members/${id}`); },
  getAdminLoyaltyMemberTransactions(id, page = 1, filters) { return request(`/admin/loyalty/members/${id}/transactions?${loyaltyQuery(page, 20, filters)}`); },
  createLoyaltyRule(payload) { return request('/admin/loyalty/rules', { method: 'POST', body: JSON.stringify(payload) }); },
  updateLoyaltyRule(id, payload) { return request(`/admin/loyalty/rules/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); },
  submitLoyaltyRule(id) { return request(`/admin/loyalty/rules/${id}/submit`, { method: 'POST' }); },
  publishLoyaltyRule(id, effectiveAt, expectedVersion) { return request(`/admin/loyalty/rules/${id}/publish`, { method: 'POST', body: JSON.stringify({ effectiveAt, expectedVersion }) }); },
  createLoyaltyReward(payload) { return request('/admin/loyalty/rewards', { method: 'POST', body: JSON.stringify(payload) }); },
  updateLoyaltyReward(id, payload) { return request(`/admin/loyalty/rewards/${id}/details`, { method: 'PATCH', body: JSON.stringify(payload) }); },
  getAdminLoyaltyReward(id) { return request(`/admin/loyalty/rewards/${id}`); },
  setLoyaltyRewardStatus(id, active, expectedVersion) { return request(`/admin/loyalty/rewards/${id}`, { method: 'PATCH', body: JSON.stringify({ active, expectedVersion }) }); },
  resolveLoyaltyComplaint(id, payload) { return request(`/admin/loyalty/complaints/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); },
  createLoyaltyAdjustment(payload) { return request('/admin/loyalty/adjustments', { method: 'POST', body: JSON.stringify(payload) }); },
  decideLoyaltyAdjustment(id, payload) { return request(`/admin/loyalty/adjustments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); },
  runLoyaltyJobs() { return request('/admin/loyalty/jobs/run', { method: 'POST' }); },
  confirmCodPayment(id, reference) { return request(`/orders/${id}/confirm-cod-payment`, { method: 'POST', body: JSON.stringify({ reference }) }); },

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
  quoteOrder(payload) { return request('/orders/quote', { method: 'POST', body: JSON.stringify(payload) }); },

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

  updateOrderStatus(orderId, status, expectedStatus = undefined) {
    return request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, expectedStatus }),
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

  getAdminUsers(page = 1, filters = {}) {
    return request(`/admin/users?${new URLSearchParams({ page: String(page), limit: '50', ...filters })}`);
  },
  getAdminUser(id) { return request(`/admin/users/${id}`); },
  updateAdminUser(id, payload) { return request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); },
  getAdminCatalogOptions() { return request('/admin/catalog-options'); },
  getAdminProducts(page = 1, filters = {}) { return request(`/admin/products?${new URLSearchParams({ page: String(page), limit: '50', ...filters })}`); },
  getAdminProduct(id) { return request(`/admin/products/${id}`); },
  createAdminProduct(payload) { return request('/admin/products', { method: 'POST', body: JSON.stringify(payload) }); },
  updateAdminProduct(id, payload) { return request(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); },
  getAdminCategories(page = 1, filters = {}) { return request(`/admin/categories?${new URLSearchParams({ page: String(page), limit: '50', ...filters })}`); },
  createAdminCategory(payload) { return request('/admin/categories', { method: 'POST', body: JSON.stringify(payload) }); },
  updateAdminCategory(id, payload) { return request(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); },

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
  updateCoupon(id, data) {
    return request(`/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  createCoupon(data) {
    return request('/coupons', { method: 'POST', body: JSON.stringify(data) });
  },
};
