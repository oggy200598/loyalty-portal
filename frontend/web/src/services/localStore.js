import { api } from '../services/api';

const CART_KEY = 'riskmind_cart';
const WISHLIST_KEY = 'riskmind_wishlist';
const ORDERS_KEY = 'riskmind_orders';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ================= CART ================= */

export function getCart() {
  return readJson(CART_KEY, []);
}

export function saveCart(items) {
  writeJson(CART_KEY, items);
  window.dispatchEvent(
    new CustomEvent('cart-changed', {
      detail: items.length,
    }),
  );
}

export function addToCart(item) {
  const cart = getCart();

  const existing = cart.find(
    (entry) =>
      entry.productId === item.productId &&
      entry.variantId === item.variantId,
  );

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);
  return cart;
}

export function updateCartItem(
  productId,
  variantId,
  quantity,
) {
  const cart = getCart().map((entry) =>
    entry.productId === productId &&
    entry.variantId === variantId
      ? { ...entry, quantity }
      : entry,
  );

  saveCart(cart);
  return cart;
}

export function removeFromCart(productId, variantId) {
  const cart = getCart().filter(
    (entry) =>
      !(
        entry.productId === productId &&
        entry.variantId === variantId
      ),
  );

  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}

/**
 * Làm giàu item trong giỏ với dữ liệu thật từ API
 * (giá, tên, ảnh, variant, tồn kho).
 * Không hard-code giá — luôn lấy từ backend.
 */
export async function getCartWithProducts() {
  const cart = getCart();

  const enriched = await Promise.all(
    cart.map(async (entry) => {
      try {
        const product = await api.getProductById(
          entry.productId,
        );

        const variant = product.variants?.find(
          (v) => String(v.id) === String(entry.variantId),
        );

        const image =
          product.images?.find((item) => item.isPrimary)
            ?.imageUrl ??
          product.images?.[0]?.imageUrl ??
          '';

        return {
          ...entry,
          product,
          variant,
          unitPrice: variant
            ? Number(variant.price ?? product.price)
            : Number(product.price ?? 0),
          stockQuantity: variant
            ? Number(variant.stockQuantity ?? 0)
            : Number(product.stockQuantity ?? 0),
          imageUrl: image,
        };
      } catch {
        return {
          ...entry,
          product: null,
          unavailable: true,
        };
      }
    }),
  );

  return enriched;
}

/* ================= WISHLIST ================= */

export function getWishlist() {
  return readJson(WISHLIST_KEY, []);
}

export function isInWishlist(productId) {
  return getWishlist().some(
    (id) => String(id) === String(productId),
  );
}

export function toggleWishlist(productId) {
  let list = getWishlist();

  if (isInWishlist(productId)) {
    list = list.filter(
      (id) => String(id) !== String(productId),
    );
  } else {
    list.push(productId);
  }

  writeJson(WISHLIST_KEY, list);
  return list;
}

/* ================= ORDERS (local draft) ================= */

export function getLocalOrders() {
  return readJson(ORDERS_KEY, []);
}

export function saveLocalOrder(order) {
  const orders = getLocalOrders();
  orders.unshift(order);
  writeJson(ORDERS_KEY, orders);
  return order;
}

export function getLocalOrderById(id) {
  return getLocalOrders().find(
    (order) => String(order.id) === String(id),
  );
}
