const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

export const api = {
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

  getLatestRecommendation() {
    return request('/recommendations/latest');
  },
};