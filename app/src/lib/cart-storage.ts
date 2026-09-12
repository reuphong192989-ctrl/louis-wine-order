export type CartLineState = { qty: number; note: string };
export type CartMap = Record<string, CartLineState>; // menuItemId -> { qty, note }

const keyFor = (tableId: string) => `lwo-cart-${tableId}`;

// Older carts saved before per-item notes stored `Record<string, number>`
// (menuItemId -> qty) — treat any number found as {qty, note: ""}.
export function loadCart(tableId: string): CartMap {
  try {
    const raw = localStorage.getItem(keyFor(tableId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number | CartLineState>;
    const result: CartMap = {};
    for (const [id, v] of Object.entries(parsed)) {
      result[id] = typeof v === "number" ? { qty: v, note: "" } : { qty: v.qty, note: v.note ?? "" };
    }
    return result;
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
