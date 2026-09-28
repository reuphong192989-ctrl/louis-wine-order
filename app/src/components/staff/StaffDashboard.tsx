"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime, formatVnd } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { playAlertSound } from "@/lib/sound";
import { useTableNames, tableLabel } from "@/lib/use-table-names";
import type { OrderDTO, ReservationDTO, StaffCallDTO } from "@/types";

export default function StaffDashboard({ username, role }: { username: string; role: "OWNER" | "ADMIN" | "STAFF" }) {
  const router = useRouter();
  const tableNames = useTableNames();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [calls, setCalls] = useState<StaffCallDTO[]>([]);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const knownPendingIds = useRef<Set<string> | null>(null);
  const [connError, setConnError] = useState(false);

  // Poll every few seconds — the realtime substitute for WebSocket push on
  // serverless hosting. Plays a chime only for genuinely new PENDING
  // orders/calls/website bookings (not on every poll), so it works unattended.
  usePolling(async () => {
    let responses: Response[];
    try {
      responses = await Promise.all([fetch("/api/orders"), fetch("/api/staff-calls"), fetch("/api/reservations?scope=staff")]);
    } catch {
      setConnError(true); // offline — keep showing the last known lists
      return;
    }
    if (responses.some((r) => r.status === 401)) {
      // Session expired (12h shift): never leave a silently empty screen.
      router.push(role === "STAFF" ? "/staff/login" : "/admin/login");
      return;
    }
    if (responses.some((r) => !r.ok)) {
      // Server hiccup: keep the last lists and don't touch the chime baseline,
      // otherwise cards would vanish and every pending item would re-chime.
      setConnError(true);
      return;
    }
    const [ordersRes, callsRes, resRes] = responses;
    const nextOrders: OrderDTO[] = (await ordersRes.json()).orders;
    const nextCalls: StaffCallDTO[] = (await callsRes.json()).calls;
    const nextRes: ReservationDTO[] = (await resRes.json()).reservations;
    setConnError(false);

    const nowPendingIds = new Set([
      ...nextOrders.filter((o) => o.status === "PENDING").map((o) => o.id),
      ...nextCalls.filter((c) => c.status === "PENDING").map((c) => c.id),
      ...nextRes.filter((r) => r.status === "NEW").map((r) => `res:${r.id}`),
    ]);
    if (knownPendingIds.current) {
      const hasNew = [...nowPendingIds].some((id) => !knownPendingIds.current!.has(id));
      if (hasNew) playAlertSound();
    }
    knownPendingIds.current = nowPendingIds;

    setOrders(nextOrders);
    setCalls(nextCalls);
    setReservations(nextRes);
  }, 4_000);

  async function updateReservation(id: string, status: ReservationDTO["status"]) {
    setBusyIds((s) => new Set(s).add(id));
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const { reservation } = await res.json();
        setReservations((list) => list.map((r) => (r.id === id ? reservation : r)));
      } else {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Không cập nhật được lượt đặt bàn — vui lòng thử lại.");
      }
    } catch {
      window.alert("Mất kết nối — chưa cập nhật được lượt đặt bàn, vui lòng thử lại.");
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

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
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const newReservations = reservations
    .filter((r) => r.status === "NEW")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const todayReservations = reservations
    .filter((r) => r.date === today && r.status !== "NEW" && r.status !== "CANCELLED")
    .sort((a, b) => (a.time < b.time ? -1 : 1));
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
        {connError && (
          <div
            role="alert"
            style={{ background: "var(--color-accent)", color: "#fff", padding: "var(--space-2) var(--space-3)", fontWeight: 700 }}
          >
            ⚠ Mất kết nối tới máy chủ — đang thử lại. Danh sách bên dưới có thể chưa cập nhật; gọi Hotline nếu kéo dài.
          </div>
        )}

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
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>Bàn {tableLabel(tableNames, c.tableId)}</div>
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
                      <td>{tableLabel(tableNames, c.tableId)}</td>
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
          <h3>
            Đặt bàn mới {newReservations.length > 0 && <span className="tag tag-accent">{newReservations.length} chờ xác nhận</span>}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {newReservations.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "2px solid var(--color-accent)",
                  background: r.isLumiaGuest ? "var(--color-accent-2-100)" : "var(--color-neutral-100)",
                  padding: "var(--space-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>
                    {r.time} · {r.date === today ? "Hôm nay" : r.date.split("-").reverse().join("/")}
                  </span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{r.guests} khách</span>
                </div>
                <div>
                  {r.customerName} ·{" "}
                  <a href={`tel:${r.phone}`} style={{ color: "var(--color-accent)", fontWeight: 700 }}>{r.phone}</a>
                </div>
                {(r.area || r.occasion) && <div>{[r.area, r.occasion && `🎉 ${r.occasion}`].filter(Boolean).join(" · ")}</div>}
                {r.isLumiaGuest && (
                  <div style={{ fontWeight: 700 }}>
                    🏨 Lumia phòng {r.hotelRoom} {r.roomVerified ? "✓ QR" : "⚠ cần xác minh"} · -10%
                    {r.needShuttle && <div>🚐 Xe đón tại sảnh Lumia lúc {r.pickupTime}</div>}
                  </div>
                )}
                {r.note && <div>📝 {r.note}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={busyIds.has(r.id)} onClick={() => updateReservation(r.id, "CONFIRMED")}>
                    Đã gọi xác nhận
                  </button>
                  <button className="btn btn-danger" disabled={busyIds.has(r.id)} onClick={() => updateReservation(r.id, "CANCELLED")}>
                    Huỷ
                  </button>
                </div>
              </div>
            ))}
            {newReservations.length === 0 && <p className="text-muted">Không có lượt đặt bàn nào chờ xác nhận.</p>}
          </div>

          {todayReservations.length > 0 && (
            <details open style={{ marginTop: 12 }}>
              <summary className="text-muted" style={{ cursor: "pointer", fontSize: 13 }}>
                Lịch đặt bàn hôm nay ({todayReservations.length})
              </summary>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Giờ</th>
                    <th>Khách</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {todayReservations.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.time}</b>
                        {r.needShuttle && <div style={{ fontSize: 12 }}>🚐 đón {r.pickupTime}</div>}
                      </td>
                      <td>
                        {r.customerName} · {r.guests} khách
                        {r.isLumiaGuest && <div style={{ fontSize: 12 }}>Lumia phòng {r.hotelRoom}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{[r.area, r.note].filter(Boolean).join(" · ") || "—"}</td>
                      <td>
                        {r.status === "CONFIRMED" ? (
                          <button className="btn btn-secondary" disabled={busyIds.has(r.id)} onClick={() => updateReservation(r.id, "SEATED")}>
                            Khách đã đến
                          </button>
                        ) : r.status === "SEATED" ? (
                          "Đã đến"
                        ) : (
                          "Hoàn tất"
                        )}
                      </td>
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
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>
                    {o.online ? o.tableId : `Bàn ${tableLabel(tableNames, o.tableId)}`}
                  </span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{formatTime(o.createdAt)}</span>
                </div>
                {o.online && <OnlineOrderInfo online={o.online} note={o.note} />}
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
                      <td>{o.online ? `${o.tableId} · ${o.online.code}` : tableLabel(tableNames, o.tableId)}</td>
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

const CHANNEL_LABEL = { PICKUP: "Khách đến lấy", DELIVERY: "Giao tận nơi", LUMIA_ROOM: "Giao về phòng Lumia" } as const;

/** Customer / delivery details for website orders — staff call to confirm before sending to the kitchen. */
function OnlineOrderInfo({ online, note }: { online: NonNullable<OrderDTO["online"]>; note: string | null }) {
  return (
    <div style={{ fontSize: 13, background: "var(--color-accent-2-100)", border: "1px solid var(--color-accent-2-300)", padding: "6px 8px" }}>
      <div style={{ fontWeight: 700 }}>
        {CHANNEL_LABEL[online.channel]} · Mã {online.code}
      </div>
      <div>
        {online.customerName} ·{" "}
        <a href={`tel:${online.phone}`} style={{ color: "var(--color-accent)", fontWeight: 700 }}>
          {online.phone}
        </a>
      </div>
      {online.address && <div>📍 {online.address}</div>}
      {online.channel === "LUMIA_ROOM" && (
        <div style={{ color: online.roomVerified ? "var(--color-accent-2-700)" : "var(--color-accent)", fontWeight: 700 }}>
          {online.roomVerified ? "✓ Phòng đã xác thực qua QR" : "⚠ Khách nhập tay — gọi xác minh số phòng"}
        </div>
      )}
      {online.scheduledTime && <div>⏰ {online.scheduledTime}</div>}
      {note && <div>📝 {note}</div>}
      {online.discount > 0 && <div>Đã trừ ưu đãi Lumia: -{formatVnd(online.discount)}</div>}
      {online.shippingFee > 0 && <div>Phí giao: {formatVnd(online.shippingFee)}</div>}
    </div>
  );
}
