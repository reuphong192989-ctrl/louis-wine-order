"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime, formatVnd } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { playAlertSound } from "@/lib/sound";
import type { OrderDTO, StaffCallDTO } from "@/types";

export default function StaffDashboard({ username, role }: { username: string; role: "OWNER" | "ADMIN" | "STAFF" }) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [calls, setCalls] = useState<StaffCallDTO[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const knownPendingIds = useRef<Set<string> | null>(null);

  // Poll every few seconds — the realtime substitute for WebSocket push on
  // serverless hosting. Plays a chime only for genuinely new PENDING
  // orders/calls (not on every poll), so it works unattended.
  usePolling(async () => {
    const [ordersRes, callsRes] = await Promise.all([fetch("/api/orders"), fetch("/api/staff-calls")]);
    const nextOrders: OrderDTO[] = ordersRes.ok ? (await ordersRes.json()).orders : [];
    const nextCalls: StaffCallDTO[] = callsRes.ok ? (await callsRes.json()).calls : [];

    const nowPendingIds = new Set([
      ...nextOrders.filter((o) => o.status === "PENDING").map((o) => o.id),
      ...nextCalls.filter((c) => c.status === "PENDING").map((c) => c.id),
    ]);
    if (knownPendingIds.current) {
      const hasNew = [...nowPendingIds].some((id) => !knownPendingIds.current!.has(id));
      if (hasNew) playAlertSound();
    }
    knownPendingIds.current = nowPendingIds;

    setOrders(nextOrders);
    setCalls(nextCalls);
  }, 4_000);

  async function updateOrder(id: string, status: "CONFIRMED" | "CANCELLED") {
    setBusyIds((s) => new Set(s).add(id));
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async function ackCall(id: string) {
    setBusyIds((s) => new Set(s).add(id));
    try {
      await fetch(`/api/staff-calls/${id}`, { method: "PATCH" });
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(role === "STAFF" ? "/staff/login" : "/admin/login");
    router.refresh();
  }

  const pendingCalls = calls.filter((c) => c.status === "PENDING");
  const doneCalls = calls.filter((c) => c.status !== "PENDING").slice(0, 15);
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const doneOrders = orders.filter((o) => o.status !== "PENDING").slice(0, 20);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="order-header">
        <div className="order-logo">LOUIS WINE</div>
        <h3 style={{ margin: 0 }}>Màn hình nhân viên</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/kitchen" className="btn btn-secondary">
            Màn hình bếp
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

      <main className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <section>
          <h3>Gọi nhân viên {pendingCalls.length > 0 && <span className="tag tag-accent">{pendingCalls.length} đang chờ</span>}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
            {pendingCalls.map((c) => (
              <div
                key={c.id}
                style={{
                  border: "2px solid var(--color-accent)",
                  background: "var(--color-accent-100)",
                  padding: "var(--space-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>Bàn {c.tableId}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>Gọi lúc {formatTime(c.createdAt)}</div>
                <button className="btn btn-primary" disabled={busyIds.has(c.id)} onClick={() => ackCall(c.id)}>
                  Đã xử lý
                </button>
              </div>
            ))}
            {pendingCalls.length === 0 && <p className="text-muted">Không có yêu cầu nào đang chờ.</p>}
          </div>

          {doneCalls.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary className="text-muted" style={{ cursor: "pointer", fontSize: 13 }}>
                Lịch sử gần đây ({doneCalls.length})
              </summary>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Bàn</th>
                    <th>Giờ gọi</th>
                    <th>Đã xử lý lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {doneCalls.map((c) => (
                    <tr key={c.id}>
                      <td>{c.tableId}</td>
                      <td>{formatTime(c.createdAt)}</td>
                      <td>{c.acknowledgedAt ? formatTime(c.acknowledgedAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </section>

        <hr className="hr" />

        <section>
          <h3>Yêu cầu order {pendingOrders.length > 0 && <span className="tag tag-accent">{pendingOrders.length} đang chờ</span>}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {pendingOrders.map((o) => (
              <div
                key={o.id}
                style={{
                  border: "2px solid var(--color-accent)",
                  background: "var(--color-neutral-100)",
                  padding: "var(--space-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>Bàn {o.tableId}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{formatTime(o.createdAt)}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {o.items.map((it) => (
                    <li key={it.id}>
                      {it.nameSnapshot} × {it.qty}{" "}
                      <span className="text-muted">({formatVnd(it.lineTotal)})</span>
                      {it.note && (
                        <div style={{ color: "var(--color-accent)", fontSize: 12 }}>Ghi chú: {it.note}</div>
                      )}
                    </li>
                  ))}
                </ul>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--color-accent)" }}>
                  Tổng: {formatVnd(o.totalAmount)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={busyIds.has(o.id)} onClick={() => updateOrder(o.id, "CONFIRMED")}>
                    Xác nhận đã nhận đơn
                  </button>
                  <button className="btn btn-danger" disabled={busyIds.has(o.id)} onClick={() => updateOrder(o.id, "CANCELLED")}>
                    Huỷ
                  </button>
                </div>
              </div>
            ))}
            {pendingOrders.length === 0 && <p className="text-muted">Không có đơn nào đang chờ.</p>}
          </div>

          {doneOrders.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary className="text-muted" style={{ cursor: "pointer", fontSize: 13 }}>
                Lịch sử gần đây ({doneOrders.length})
              </summary>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Bàn</th>
                    <th>Giờ gửi</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {doneOrders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.tableId}</td>
                      <td>{formatTime(o.createdAt)}</td>
                      <td>{formatVnd(o.totalAmount)}</td>
                      <td>{o.status === "CONFIRMED" ? "Đã xác nhận" : "Đã huỷ"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </section>
      </main>
    </div>
  );
}
