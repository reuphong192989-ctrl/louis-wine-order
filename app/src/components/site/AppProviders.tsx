"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  itemId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl: string | null;
};

export type LumiaSession = {
  floor: number;
  room: string;
  key: string | null;
  verified: boolean;
  savedAt: number;
};

type Ctx = {
  ready: boolean;
  cart: CartLine[];
  cartCount: number;
  cartSubtotal: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  lumia: LumiaSession | null;
  setLumia: (s: LumiaSession | null) => void;
};

const AppCtx = createContext<Ctx | null>(null);

// v2: menu item ids are strings (shared with the QR table menu)
const CART_KEY = "louis-site-cart-v2";
const LUMIA_KEY = "louis-lumia-v1";
// Lumia session expires after 7 days (typical stay)
const LUMIA_TTL = 7 * 24 * 3600 * 1000;

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lumia, setLumiaState] = useState<LumiaSession | null>(null);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted cart after hydration
      if (c) setCart(JSON.parse(c));
      const l = localStorage.getItem(LUMIA_KEY);
      if (l) {
        const parsed = JSON.parse(l) as LumiaSession;
        if (Date.now() - parsed.savedAt < LUMIA_TTL) setLumiaState(parsed);
        else localStorage.removeItem(LUMIA_KEY);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  const setLumia = useCallback((s: LumiaSession | null) => {
    setLumiaState(s);
    if (s) localStorage.setItem(LUMIA_KEY, JSON.stringify(s));
    else localStorage.removeItem(LUMIA_KEY);
  }, []);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    setCart((prev) => {
      const ex = prev.find((p) => p.itemId === line.itemId);
      if (ex) return prev.map((p) => (p.itemId === line.itemId ? { ...p, qty: Math.min(99, p.qty + qty) } : p));
      return [...prev, { ...line, qty }];
    });
  }, []);

  const setQty = useCallback((itemId: string, qty: number) => {
    setCart((prev) =>
      qty <= 0 ? prev.filter((p) => p.itemId !== itemId) : prev.map((p) => (p.itemId === itemId ? { ...p, qty: Math.min(99, qty) } : p)),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      cart,
      cartCount: cart.reduce((s, l) => s + l.qty, 0),
      cartSubtotal: cart.reduce((s, l) => s + l.qty * l.price, 0),
      add,
      setQty,
      clearCart,
      lumia,
      setLumia,
    }),
    [ready, cart, add, setQty, clearCart, lumia, setLumia],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProviders");
  return c;
}
