export function selectedCartItems(items, selectedIds) {
  if (!selectedIds) return items;
  const selected = new Set(selectedIds.map(String));
  return items.filter((item) => selected.has(String(item.id)));
}

export function checkoutItems(items) {
  return items.map((item) => ({
    productId: Number(item.productId),
    ...(item.variantId == null ? {} : { variantId: Number(item.variantId) }),
    quantity: item.quantity,
  }));
}

export function orderRows(response) {
  return Array.isArray(response) ? response : response?.data ?? [];
}
