"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatVnd } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { loadCart, saveCart, clearCart, type CartMap } from "@/lib/cart-storage";
import { useTableNames, tableLabel } from "@/lib/use-table-names";
import type { CategoryDTO, MenuItemDTO } from "@/types";
import CartDrawer, { type CartLine } from "./CartDrawer";
import MenuItemModal from "./MenuItemModal";
import OrderSentDialog from "./OrderSentDialog";
import TableSwitchModal from "./TableSwitchModal";
import Toast, { type ToastMsg } from "@/components/Toast";
import { LANG_COOKIE, LANG_LABEL, fmt, priceLabel, type Lang } from "@/lib/site/i18n";
import { categoryName, dishText, searchKey } from "@/lib/site/menu-i18n";
import { ORDER_LANGS, orderDict } from "@/lib/order-i18n";

const HIGHLIGHT_TAB_ID = "__highlight__";
const FEATURED_TAB_ID = "__featured__";

// A tablet permanently assigned to a table (no QR) remembers its table here.
const ASSIGNED_TABLE_KEY = "lwo-assigned-table";

// Categories whose product photos are tall standing bottles/cans — shown with
// a portrait image box instead of the default landscape crop.
const BOTTLE_CATEGORY_SLUGS = new Set(["vang-do", "ruou-manh", "ruou-ngam-duong-sinh", "bia", "nuoc-ngot"]);

type OrderStatus = "idle" | "sending" | "sent" | "error";

export default function OrderApp({ initialLang = "vi" }: { initialLang?: Lang }) {
  const searchParams = useSearchParams();
  const [lang, setLangState] = useState<Lang>(initialLang);
  const t = orderDict(lang);
  function setLang(l: Lang) {
    setLangState(l);
    // Shared with the public website so the guest's choice follows them.
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }
  const qrTableId = searchParams.get("table");
  const [assignedTableId, setAssignedTableId] = useState<string | null>(null);
  const [overrideTableId, setOverrideTableId] = useState<string | null>(null);
  // Priority: an explicit in-session switch wins, then the QR code in the URL
  // (per-visit, a customer's own device), then a tablet's remembered table
  // assignment, then the historical "01" default.
  const tableId = overrideTableId || qrTableId || assignedTableId || "01";
  const [showTableSwitch, setShowTableSwitch] = useState(false);
  const tableNames = useTableNames();

  useEffect(() => {
    try {
      setAssignedTableId(localStorage.getItem(ASSIGNED_TABLE_KEY));
    } catch {
      // storage unavailable — fall back to the "01" default
    }
  }, []);

  const [categories, setCategories] = useState<CategoryDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>(HIGHLIGHT_TAB_ID);
  const [searchText, setSearchText] = useState("");
  const [cart, setCart] = useState<CartMap>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("idle");
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showSentDialog, setShowSentDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItemDTO | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [callStaffCooldown, setCallStaffCooldown] = useState(false);
  const lastOrderIdRef = useRef<string | null>(null);
  const cartHydrated = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  const pushToast = useCallback((text: string, tone: "default" | "error" = "default") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      if (!res.ok) throw new Error("menu");
      const data = await res.json();
      setCategories(data.categories);
      setLoadError(null);
    } catch {
      setLoadError("load");
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
        pushToast(tRef.current.confirmed);
      } else if (data.order.status === "CANCELLED") {
        setOrderStatus("error");
        setOrderError(tRef.current.cancelled);
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

  const bottleCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cat of categories ?? []) {
      if (BOTTLE_CATEGORY_SLUGS.has(cat.slug)) ids.add(cat.id);
    }
    return ids;
  }, [categories]);

  const isSearching = searchText.trim().length > 0;
  const q = searchKey(searchText.trim());

  // Search matches the Vietnamese name and its English/Russian translation.
  const searchKeys = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of categories ?? []) {
      for (const it of cat.items) {
        const en = dishText(it.name, null, "en").name;
        const ru = dishText(it.name, null, "ru").name;
        m.set(it.id, searchKey(it.name, en, ru));
      }
    }
    return m;
  }, [categories]);

  const activeCatName = useMemo(() => {
    if (activeCat === HIGHLIGHT_TAB_ID) return t.highlight;
    if (activeCat === FEATURED_TAB_ID) return t.featured;
    const name = categories?.find((c) => c.id === activeCat)?.name ?? "";
    return categoryName(name, lang);
  }, [activeCat, categories, t, lang]);

  const displayItems: MenuItemDTO[] = useMemo(() => {
    if (!categories) return [];
    if (isSearching) {
      const all = categories.flatMap((c) => c.items);
      return all.filter((it) => (searchKeys.get(it.id) ?? "").includes(q));
    }
    if (activeCat === HIGHLIGHT_TAB_ID) {
      return categories.flatMap((c) => c.items).filter((it) => it.isHighlight);
    }
    if (activeCat === FEATURED_TAB_ID) {
      return categories.flatMap((c) => c.items).filter((it) => it.isFeaturedSpecial);
    }
    return categories.find((c) => c.id === activeCat)?.items ?? [];
  }, [categories, isSearching, q, activeCat, searchKeys]);

  function selectCategory(id: string) {
    setActiveCat(id);
    setSearchText("");
  }

  function addToCart(itemId: string, qty = 1) {
    setCart((c) => ({ ...c, [itemId]: { qty: (c[itemId]?.qty ?? 0) + qty, note: c[itemId]?.note ?? "" } }));
  }

  function changeQty(itemId: string, delta: number) {
    setCart((c) => {
      const next = { ...c };
      const cur = next[itemId];
      const qty = (cur?.qty ?? 0) + delta;
      if (qty <= 0) delete next[itemId];
      else next[itemId] = { qty, note: cur?.note ?? "" };
      return next;
    });
  }

  function setItemNote(itemId: string, note: string) {
    setCart((c) => (c[itemId] ? { ...c, [itemId]: { ...c[itemId], note } } : c));
  }

  const cartLines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([itemId, line]) => {
        const item = itemsById.get(itemId);
        if (!item || item.priceValue == null) return null;
        return {
          itemId,
          name: dishText(item.name, null, lang).name,
          unitPrice: item.priceValue,
          qty: line.qty,
          lineTotal: item.priceValue * line.qty,
          note: line.note,
        };
      })
      .filter((l): l is CartLine => l !== null);
  }, [cart, itemsById, lang]);

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
          items: cartLines.map((l) => ({ menuItemId: l.itemId, qty: l.qty, note: l.note.trim() || undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(lang === "vi" ? data.error || t.sendFailed : t.sendFailed);
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
      pushToast(t.staffCalled);
    } catch {
      pushToast(t.staffCallFailed, "error");
    }
  }

  function handleTableSwitched(newTableId: string) {
    try {
      localStorage.setItem(ASSIGNED_TABLE_KEY, newTableId);
    } catch {
      // storage unavailable — the switch still applies for this session via overrideTableId
    }
    setAssignedTableId(newTableId);
    setOverrideTableId(newTableId);
    setCart(loadCart(newTableId));
    cartHydrated.current = true;
    setShowTableSwitch(false);
    pushToast(fmt(t.switched, { n: newTableId }));
  }

  if (loadError) {
    return (
      <div className="order-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ padding: 24, textAlign: "center" }}>{t.loadError}</p>
      </div>
    );
  }

  if (!categories) {
    return (
      <div className="order-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <p className="text-muted" style={{ padding: 24 }}>
          {t.loading}
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
        <button
          type="button"
          className="tag tag-outline"
          onClick={() => setShowTableSwitch(true)}
          style={{ cursor: "pointer" }}
        >
          {fmt(t.table, { n: tableLabel(tableNames, tableId) })}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowTableSwitch(true)}
          style={{ flex: "none", fontSize: 11, padding: "6px 10px" }}
        >
          {t.switchTable}
        </button>
        <button className="btn btn-secondary" onClick={callStaff} disabled={callStaffCooldown} style={{ flex: "none" }}>
          {t.callStaff}
        </button>
        <div className="lang-switch" role="group" aria-label={t.language}>
          {ORDER_LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} className={l === lang ? "active" : ""} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <input
          className="input order-search"
          placeholder={t.search}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button className="btn btn-primary order-cart-btn" onClick={() => setCartOpen(true)}>
          {t.cart}
          {cartCount > 0 && <span className="order-cart-badge">{cartCount}</span>}
        </button>
      </header>

      <div className="order-body">
        <aside className="order-sidebar scroll-y">
          <button
            className={`order-cat-btn ${activeCat === HIGHLIGHT_TAB_ID && !isSearching ? "active" : ""}`}
            onClick={() => selectCategory(HIGHLIGHT_TAB_ID)}
          >
            {t.highlight}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`order-cat-btn ${activeCat === cat.id && !isSearching ? "active" : ""}`}
              onClick={() => selectCategory(cat.id)}
            >
              {categoryName(cat.name, lang)}
            </button>
          ))}
        </aside>

        <main className="order-main scroll-y">
          <h3 style={{ marginTop: 0 }}>{isSearching ? fmt(t.resultsFor, { q: searchText }) : activeCatName}</h3>
          {displayItems.length === 0 && <p className="text-muted">{t.noItems}</p>}
          <div className="order-grid">
            {displayItems.map((item) => {
              const tr = dishText(item.name, item.note, lang);
              return (
              <div className="item-card" key={item.id}>
                {item.imageUrl && (
                  <img
                    className={`item-img ${bottleCategoryIds.has(item.categoryId) ? "item-img--bottle" : ""}`}
                    src={item.imageUrl}
                    alt={tr.name}
                    style={{ cursor: "pointer" }}
                    onClick={() => setDetailItem(item)}
                  />
                )}
                <div className="item-body">
                  <div className="item-name" style={{ cursor: "pointer" }} onClick={() => setDetailItem(item)}>
                    {tr.name}
                  </div>
                  {lang !== "vi" && tr.name !== item.name && <div className="item-note text-muted">{item.name}</div>}
                  {tr.note && (
                    <div className="item-note text-muted">{tr.note}</div>
                  )}
                  <div className="item-row">
                    <span className="item-price">{priceLabel(item.priceText, lang)}</span>
                    {item.priceValue != null && (
                      <button className="item-add-btn" onClick={() => addToCart(item.id)} aria-label={fmt(t.add, { name: tr.name })}>
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </main>
      </div>

      <footer className="order-footer">
        <span className="text-muted" style={{ fontSize: 12 }}>
          {t.footerNote}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="order-total">{formatVnd(cartTotal)}</span>
          <button className="btn btn-primary" onClick={() => setCartOpen(true)}>
            {fmt(t.viewCart, { n: cartCount })}
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
        onNoteChange={setItemNote}
        onSubmit={submitOrder}
        t={t.drawer}
      />

      {detailItem && (
        <MenuItemModal
          item={detailItem}
          lang={lang}
          t={t.item}
          isBottle={bottleCategoryIds.has(detailItem.categoryId)}
          onClose={() => setDetailItem(null)}
          onAdd={(qty) => addToCart(detailItem.id, qty)}
        />
      )}

      {showSentDialog && (
        <OrderSentDialog
          onClose={() => setShowSentDialog(false)}
          onCallStaff={() => {
            callStaff();
            setShowSentDialog(false);
          }}
          callStaffDisabled={callStaffCooldown}
          t={t.sent}
        />
      )}

      {showTableSwitch && (
        <TableSwitchModal
          currentTableId={tableId}
          currentTableLabel={tableLabel(tableNames, tableId)}
          cartHasItems={Object.keys(cart).length > 0}
          onClose={() => setShowTableSwitch(false)}
          onSwitched={handleTableSwitched}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
