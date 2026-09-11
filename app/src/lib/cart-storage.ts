export type CartMap = Record<string, number>; // menuItemId -> qty

const keyFor = (tableId: string) => `lwo-cart-${tableId}`;

export function loadCart(tableId: string): CartMap {
  try {
    const raw = localStorage.getItem(keyFor(tableId));
    return raw ? (JSON.parse(raw) as CartMap) : {};
  } catch {
    return {};
  }
}

export function saveCart(tableId: string, cart: CartMap) {
  try {
    localStorage.setItem(keyFor(tableId), JSON.stringify(cart));
  } catch {
    // storage unavailable (private mode, quota) — cart just won't survive a reload
  }
}

export function clearCart(tableId: string) {
  try {
    localStorage.removeItem(keyFor(tableId));
  } catch {
    // ignore
  }
}
