"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatVnd } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { loadCart, saveCart, clearCart, type CartMap } from "@/lib/cart-storage";
import type { CategoryDTO, MenuItemDTO } from "@/types";
import CartDrawer, { type CartLine } from "./CartDrawer";
import OrderSentDialog from "./OrderSentDialog";
import Toast, { type ToastMsg } from "@/components/Toast";

const HIGHLIGHT_TAB_ID = "__highlight__";

type OrderStatus = "idle" | "sending" | "sent" | "error";

export default function OrderApp() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table") || "01";

  const [categories, setCategories] = useState<CategoryDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>(HIGHLIGHT_TAB_ID);
  const [searchText, setSearchText] = useState("");
  const [cart, setCart] = useState<CartMap>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("idle");
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showSentDialog, setShowSentDialog] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [callStaffCooldown, setCallStaffCooldown] = useState(false);
  const lastOrderIdRef = useRef<string | null>(null);
  const cartHydrated = useRef(false);

  const pushToast = useCallback((text: string, tone: "default" | "error" = "default") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      if (!res.ok) throw new Error("Không tải được menu");
      const data = await res.json();
      setCategories(data.categories);
      setLoadError(null);
    } catch {
      setLoadError("Không tải được menu. Vui lòng kiểm tra kết nối và thử lại.");
    }
  }, []);

  // Refresh the menu periodically so price/stock/photo changes made by admin
  // show up without the customer needing to reload the page.
  usePolling(fetchMenu, 20_000);

  // Hydrate cart from localStorage once we know the table id.
  useEffect(() => {
    setCart(loadCart(tableId));
    cartHydrated.current = true;
  }, [tableId]);

  useEffect(() => {
    if (!cartHydrated.current) return;
    saveCart(tableId, cart);
  }, [cart, tableId]);

  // While an order is waiting on staff, poll its status every few seconds —
  // there's no WebSocket push on serverless hosting, so this is the
  // realtime substitute for "staff confirmed/cancelled my order".
  usePolling(async () => {
    if (orderStatus !== "sent" || !lastOrderIdRef.current) return;
    try {
      const res = await fetch(`/api/orders/${lastOrderIdRef.current}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.order.status === "CONFIRMED") {
        setOrderStatus("idle");
        setCart({});
        clearCart(tableId);
        pushToast("Nhân viên đã xác nhận đơn của bạn. Cảm ơn quý khách!");
      } else if (data.order.status === "CANCELLED") {
        setOrderStatus("error");
        setOrderError("Đơn hàng đã bị huỷ bởi nhân viên. Vui lòng kiểm tra lại giỏ hàng và gửi lại.");
      }
    } catch {
      // transient network error — next poll will retry
    }
  }, 3_000);

  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItemDTO>();
    for (const cat of categories ?? []) {
      for (const item of cat.items) map.set(item.id, item);
    }
    return map;
  }, [categories]);

  const isSearching = searchText.trim().length > 0;
  const q = searchText.trim().toLowerCase();

  const activeCatName = useMemo(() => {
    if (activeCat === HIGHLIGHT_TAB_ID) return "Món Nổi Bật";
    return categories?.find((c) => c.id === activeCat)?.name ?? "";
  }, [activeCat, categories]);

  const displayItems: MenuItemDTO[] = useMemo(() => {
    if (!categories) return [];
    if (isSearching) {
      const all = categories.flatMap((c) => c.items);
      return all.filter((it) => it.name.toLowerCase().includes(q));
    }
    if (activeCat === HIGHLIGHT_TAB_ID) {
      return categories.flatMap((c) => c.items).filter((it) => it.isHighlight);
    }
    return categories.find((c) => c.id === activeCat)?.items ?? [];
  }, [categories, isSearching, q, activeCat]);

  function selectCategory(id: string) {
    setActiveCat(id);
    setSearchText("");
  }

  function addToCart(itemId: string) {
    setCart((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }));
  }

  function changeQty(itemId: string, delta: number) {
    setCart((c) => {
      const next = { ...c };
      const qty = (next[itemId] ?? 0) + delta;
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  }

  const cartLines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([itemId, qty]) => {
        const item = itemsById.get(itemId);
        if (!item || item.priceValue == null) return null;
        return { itemId, name: item.name, unitPrice: item.priceValue, qty, lineTotal: item.priceValue * qty };
      })
      .filter((l): l is CartLine => l !== null);
  }, [cart, itemsById]);

  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.lineTotal, 0);

  async function submitOrder() {
    if (cartLines.length === 0) return;
    setOrderStatus("sending");
    setOrderError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: cartLines.map((l) => ({ menuItemId: l.itemId, qty: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không gửi được yêu cầu.");
      lastOrderIdRef.current = data.order.id;
      setOrderStatus("sent");
      setCartOpen(false);
      setShowSentDialog(true);
    } catch (e) {
      setOrderStatus("error");
      setOrderError((e as Error).message);
    }
  }

  async function callStaff() {
    if (callStaffCooldown) return;
    setCallStaffCooldown(true);
    setTimeout(() => setCallStaffCooldown(false), 10_000);
    try {
      const res = await fetch("/api/staff-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      if (!res.ok) throw new Error();
      pushToast("Đã gửi yêu cầu, nhân viên sẽ tới ngay.");
    } catch {
      pushToast("Không gửi được yêu cầu gọi nhân viên. Vui lòng thử lại.", "error");
    }
  }

  if (loadError) {
    return (
      <div className="order-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ padding: 24, textAlign: "center" }}>{loadError}</p>
      </div>
    );
  }

  if (!categories) {
    return (
      <div className="order-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <p className="text-muted" style={{ padding: 24 }}>
          Đang tải menu...
        </p>
      </div>
    );
  }

  return (
    <div className="order-shell">
      <header className="order-header">
        <div style={{ flex: "none", lineHeight: 1.2 }}>
          <div className="order-logo" style={{ lineHeight: 1.1 }}>LOUIS WINE</div>
          <div className="text-muted" style={{ fontSize: 9 }}>Phát triển bởi Thành IT · 0382821682</div>
        </div>
        <span className="tag tag-outline">Bàn {tableId}</span>
        <button className="btn btn-secondary" onClick={callStaff} disabled={callStaffCooldown} style={{ flex: "none" }}>
          Gọi nhân viên
        </button>
        <input
          className="input order-search"
          placeholder="Nhập tên món..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button className="btn btn-primary order-cart-btn" onClick={() => setCartOpen(true)}>
          Giỏ hàng
          {cartCount > 0 && <span className="order-cart-badge">{cartCount}</span>}
        </button>
      </header>

      <div className="order-body">
        <aside className="order-sidebar scroll-y">
          <button
            className={`order-cat-btn ${activeCat === HIGHLIGHT_TAB_ID && !isSearching ? "active" : ""}`}
            onClick={() => selectCategory(HIGHLIGHT_TAB_ID)}
          >
            Món Nổi Bật
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`order-cat-btn ${activeCat === cat.id && !isSearching ? "active" : ""}`}
              onClick={() => selectCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </aside>

        <main className="order-main scroll-y">
          <h3 style={{ marginTop: 0 }}>{isSearching ? `Kết quả cho "${searchText}"` : activeCatName}</h3>
          {displayItems.length === 0 && <p className="text-muted">Không có món nào.</p>}
          <div className="order-grid">
            {displayItems.map((item) => (
              <div className="item-card" key={item.id}>
                {item.imageUrl && <img className="item-img" src={item.imageUrl} alt={item.name} />}
                <div className="item-body">
                  <div className="item-name">{item.name}</div>
                  {item.note && (
                    <div className="item-note text-muted">{item.note}</div>
                  )}
                  <div className="item-row">
                    <span className="item-price">{item.priceText}</span>
                    {item.priceValue != null && (
                      <button className="item-add-btn" onClick={() => addToCart(item.id)} aria-label={`Thêm ${item.name}`}>
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer className="order-footer">
        <span className="text-muted" style={{ fontSize: 12 }}>
          Giá chưa bao gồm VAT. Hải sản tươi sống theo thời giá.
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="order-total">{formatVnd(cartTotal)}</span>
          <button className="btn btn-primary" onClick={() => setCartOpen(true)}>
            Xem giỏ hàng ({cartCount})
          </button>
        </div>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cartLines}
        total={cartTotal}
        orderStatus={orderStatus}
        errorMessage={orderError}
        onInc={(id) => changeQty(id, 1)}
        onDec={(id) => changeQty(id, -1)}
        onSubmit={submitOrder}
      />

      {showSentDialog && (
        <OrderSentDialog
          onClose={() => setShowSentDialog(false)}
          onCallStaff={() => {
            callStaff();
            setShowSentDialog(false);
          }}
          callStaffDisabled={callStaffCooldown}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
