"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { playAlertSound } from "@/lib/sound";
import type { OrderDTO } from "@/types";

const LATE_MS = 15 * 60 * 1000;
const STATUS_LABEL = { PENDING: "Chưa làm", COOKING: "Đang làm", DONE: "Xong" } as const;
const NEXT_STATUS = { PENDING: "COOKING", COOKING: "DONE", DONE: "PENDING" } as const;

type ViewMode = "byTable" | "grouped";

export default function KitchenDashboard({ username, role }: { username: string; role: "ADMIN" | "STAFF" }) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("byTable");
  const [now, setNow] = useState(() => Date.now());
  const knownOrderIds = useRef<Set<string> | null>(null);

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
    router.push(role === "ADMIN" ? "/admin/login" : "/staff/login");
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
          {role === "ADMIN" && (
            <Link href="/admin/categories" className="btn btn-secondary">
              Quay lại Quản trị
            </Link>
          )}
          <span className="text-muted" style={{ fontSize: 13 }}>
            {username} ({role === "ADMIN" ? "Quản lý" : "Nhân viên"})
          </span>
          <button className="btn btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}>
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
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-accent)" }}>× {g.qty}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {[...g.tables.entries()].map(([table, qty]) => `Bàn ${table} (${qty})`).join(", ")}
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
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>Bàn {o.tableId}</span>
                    <span style={{ fontSize: 12, color: late ? "var(--color-accent)" : undefined }} className={late ? undefined : "text-muted"}>
                      {formatTime(o.createdAt)} {late && "· TRỄ GIỜ"}
                    </span>
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {o.items.map((it) => (
                      <li
                        key={it.id}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13 }}
                      >
                        <span style={{ textDecoration: it.kitchenStatus === "DONE" ? "line-through" : "none" }}>
                          {it.nameSnapshot} × {it.qty}
                        </span>
                        <button
                          className={`btn ${it.kitchenStatus === "DONE" ? "btn-secondary" : it.kitchenStatus === "COOKING" ? "btn-primary" : "btn-secondary"}`}
                          style={{ flex: "none", fontSize: 12, padding: "4px 10px" }}
                          disabled={busyIds.has(it.id)}
                          onClick={() => cycleItemStatus(it.id, it.kitchenStatus)}
                        >
                          {STATUS_LABEL[it.kitchenStatus]}
                        </button>
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
