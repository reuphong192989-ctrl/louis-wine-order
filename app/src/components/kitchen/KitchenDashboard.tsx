"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatQty, formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { playAlertSound, stopAlertSound } from "@/lib/sound";
import { useTableNames, tableLabel } from "@/lib/use-table-names";
import type { OrderDTO } from "@/types";

const LATE_MS = 15 * 60 * 1000;
const STATUS_LABEL = { PENDING: "Chưa làm", COOKING: "Đang làm", DONE: "Xong" } as const;
const NEXT_STATUS = { PENDING: "COOKING", COOKING: "DONE", DONE: "PENDING" } as const;

type ViewMode = "byTable" | "grouped";

type KitchenCancellation = {
  id: string;
  tableId: string;
  tableLabel: string;
  name: string;
  qty: number;
  kitchenStatus: "PENDING" | "COOKING" | "DONE";
  scope: "item" | "order";
  cancelledAt: string;
  cancelledBy: string;
  cancelReason: string;
};

// Which cancellations this kitchen screen already acknowledged — survives a page reload.
const ACK_KEY = "lw-kitchen-acked-cancels";
function loadAcked(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(ACK_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveAcked(ids: Set<string>) {
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify([...ids].slice(-500)));
  } catch {
    // storage unavailable — acknowledgements just won't survive a reload
  }
}

export default function KitchenDashboard({ username, role }: { username: string; role: "OWNER" | "ADMIN" | "STAFF" }) {
  const router = useRouter();
  const tableNames = useTableNames();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("byTable");
  const [now, setNow] = useState(() => Date.now());
  const knownOrderIds = useRef<Set<string> | null>(null);
  const [cancels, setCancels] = useState<KitchenCancellation[]>([]);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const knownCancelIds = useRef<Set<string> | null>(null);

  useEffect(() => setAcked(loadAcked()), []);

  // Dishes taken back after the order reached the kitchen: flash + chime so cooks stop.
  usePolling(async () => {
    const res = await fetch("/api/orders/kitchen-cancellations").catch(() => null);
    if (!res?.ok) return;
    const list: KitchenCancellation[] = (await res.json()).cancellations;
    const ids = new Set(list.map((c) => c.id));
    if (knownCancelIds.current && [...ids].some((id) => !knownCancelIds.current!.has(id))) playAlertSound();
    knownCancelIds.current = ids;
    setCancels(list);
  }, 4_000);

  function ackCancels(ids: string[]) {
    stopAlertSound();
    setAcked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      saveAcked(next);
      return next;
    });
  }

  const unackedCancels = cancels.filter((c) => !acked.has(c.id));

  usePolling(async () => {
    const res = await fetch("/api/orders?status=CONFIRMED");
    const nextOrders: OrderDTO[] = res.ok ? (await res.json()).orders : [];

    const activeIds = new Set(nextOrders.filter((o) => o.items.some((it) => it.kitchenStatus !== "DONE")).map((o) => o.id));
    if (knownOrderIds.current) {
      const hasNew = [...activeIds].some((id) => !knownOrderIds.current!.has(id));
      if (hasNew) playAlertSound();
    }
    knownOrderIds.current = activeIds;

    setOrders(nextOrders);
    setNow(Date.now());
  }, 4_000);

  const activeOrders = useMemo(
    () =>
      orders
        .filter((o) => o.items.some((it) => it.kitchenStatus !== "DONE"))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    [orders]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; tables: Map<string, number> }>();
    for (const o of activeOrders) {
      for (const it of o.items) {
        if (it.kitchenStatus === "DONE") continue;
        const g = map.get(it.nameSnapshot) ?? { name: it.nameSnapshot, qty: 0, tables: new Map() };
        g.qty += it.qty;
        g.tables.set(o.tableId, (g.tables.get(o.tableId) ?? 0) + it.qty);
        map.set(it.nameSnapshot, g);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [activeOrders]);

  async function cycleItemStatus(itemId: string, current: "PENDING" | "COOKING" | "DONE") {
    stopAlertSound();
    setBusyIds((s) => new Set(s).add(itemId));
    try {
      await fetch(`/api/order-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitchenStatus: NEXT_STATUS[current] }),
      });
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(role === "STAFF" ? "/staff/login" : "/admin/login");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="order-header">
        <div className="order-logo">LOUIS WINE</div>
        <h3 style={{ margin: 0 }}>Màn hình bếp</h3>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={`btn ${view === "byTable" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("byTable")}>
            Theo bàn
          </button>
          <button className={`btn ${view === "grouped" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("grouped")}>
            Gộp món
          </button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/staff" className="btn btn-secondary">
            Màn hình nhân viên
          </Link>
          {role !== "STAFF" && (
            <Link href="/admin/categories" className="btn btn-secondary">
              Quay lại Quản trị
            </Link>
          )}
          <span className="text-muted" style={{ fontSize: 13 }}>
            {username} ({role === "OWNER" ? "Chủ sở hữu" : role === "ADMIN" ? "Quản lý" : "Nhân viên"})
          </span>
          <button className="btn btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}>
        {unackedCancels.length > 0 && (
          <div role="alert" style={{ background: "#c0141c", color: "#fff", padding: "var(--space-3)", marginBottom: "var(--space-4)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18 }}>⛔ KHÁCH HUỶ MÓN — DỪNG LÀM</span>
              <button className="btn btn-secondary" onClick={() => ackCancels(unackedCancels.map((c) => c.id))}>
                Đã biết tất cả
              </button>
            </div>
            {unackedCancels.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", padding: "6px 8px" }}>
                <span style={{ fontSize: 15 }}>
                  <b>{placeLabel(tableNames, c.tableId)}</b> · {c.name} × <b>{formatQty(c.qty)}</b>
                  <span style={{ fontSize: 12, opacity: 0.9 }}>
                    {" "}
                    — {formatTime(c.cancelledAt)} · {c.cancelReason} ({c.cancelledBy})
                  </span>
                </span>
                <button className="btn btn-secondary" style={{ flex: "none" }} onClick={() => ackCancels([c.id])}>
                  Đã biết
                </button>
              </div>
            ))}
          </div>
        )}
        {view === "grouped" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {grouped.map((g) => (
              <div
                key={g.name}
                style={{
                  border: "2px solid var(--color-divider)",
                  background: "var(--color-neutral-100)",
                  padding: "var(--space-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>{g.name}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-accent)" }}>× {formatQty(g.qty)}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {[...g.tables.entries()].map(([table, qty]) => `${placeLabel(tableNames, table)} (${formatQty(qty)})`).join(", ")}
                </div>
              </div>
            ))}
            {grouped.length === 0 && <p className="text-muted">Không có món nào đang chờ chế biến.</p>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {activeOrders.map((o) => {
              const elapsed = now - new Date(o.createdAt).getTime();
              const late = elapsed > LATE_MS;
              return (
                <div
                  key={o.id}
                  style={{
                    border: `2px solid ${late ? "var(--color-accent)" : "var(--color-divider)"}`,
                    background: late ? "var(--color-accent-100)" : "var(--color-neutral-100)",
                    padding: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>{placeLabel(tableNames, o.tableId)}</span>
                    <span style={{ fontSize: 12, color: late ? "var(--color-accent)" : undefined }} className={late ? undefined : "text-muted"}>
                      {formatTime(o.createdAt)} {late && "· TRỄ GIỜ"}
                    </span>
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {o.items.map((it) => (
                      <li key={it.id} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ textDecoration: it.kitchenStatus === "DONE" ? "line-through" : "none" }}>
                            {it.nameSnapshot} × {formatQty(it.qty)}
                          </span>
                          <button
                            className={`btn ${it.kitchenStatus === "DONE" ? "btn-secondary" : it.kitchenStatus === "COOKING" ? "btn-primary" : "btn-secondary"}`}
                            style={{ flex: "none", fontSize: 12, padding: "4px 10px" }}
                            disabled={busyIds.has(it.id)}
                            onClick={() => cycleItemStatus(it.id, it.kitchenStatus)}
                          >
                            {STATUS_LABEL[it.kitchenStatus]}
                          </button>
                        </div>
                        {it.note && (
                          <div style={{ color: "var(--color-accent)", fontSize: 12 }}>Ghi chú: {it.note}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {activeOrders.length === 0 && <p className="text-muted">Không có đơn nào đang chờ chế biến.</p>}
          </div>
        )}
      </main>
    </div>
  );
}

/** "Bàn 05" for QR table orders; website orders already carry a readable place ("Lumia 302", "Mang về", "Giao tận nơi"). */
function placeLabel(tableNames: Parameters<typeof tableLabel>[0], tableId: string): string {
  if (tableId.startsWith("Lumia ") || tableId === "Mang về" || tableId === "Giao tận nơi") return tableId;
  return `Bàn ${tableLabel(tableNames, tableId)}`;
}
