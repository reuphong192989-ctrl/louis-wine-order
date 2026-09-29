"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime, formatVnd } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { playAlertSound } from "@/lib/sound";
import type { OrderDTO, ReservationDTO } from "@/types";

// Chime and highlight a shuttle pickup this long before its time.
const SHUTTLE_ALERT_MIN = 30;

function minutesUntil(today: string, date: string, hhmm: string | null, now: number): number | null {
  if (!hhmm || date !== today) return null;
  const [h, m] = hhmm.split(":").map(Number);
  // Vietnam is UTC+7 with no DST.
  const target = Date.parse(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+07:00`);
  return Math.round((target - now) / 60000);
}

function orderStage(o: OrderDTO): { label: string; color: string } {
  if (o.status === "CANCELLED") return { label: "Đã huỷ", color: "var(--color-neutral-500)" };
  if (o.status === "PENDING") return { label: "Chờ nhà hàng xác nhận", color: "var(--color-accent)" };
  if (o.fulfillment === "DELIVERED") return { label: "Đã giao tới phòng", color: "var(--color-accent-2-700)" };
  if (o.fulfillment === "DELIVERING") return { label: "🛵 Đang mang tới", color: "var(--color-accent-2-700)" };
  const allDone = o.items.length > 0 && o.items.every((i) => i.kitchenStatus === "DONE");
  return { label: allDone ? "Món đã xong, chuẩn bị giao" : "Bếp đang làm", color: "var(--color-neutral-700)" };
}

/**
 * Lumia Apartment front desk: shuttle pickups (with a 30-minute heads-up chime),
 * room-delivery orders and upcoming bookings of Lumia guests. Read-only except
 * for marking the shuttle pickup.
 */
export default function ReceptionBoard({ username, role }: { username: string; role: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [today, setToday] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const alerted = useRef<Set<string>>(new Set());

  usePolling(async () => {
    try {
      const res = await fetch("/api/lumia-board", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/staff/login");
        return;
      }
      if (!res.ok) throw new Error();
      const data: { orders: OrderDTO[]; reservations: ReservationDTO[]; today: string } = await res.json();
      const t = Date.now();
      setError(false);
      setNow(t);
      setToday(data.today);

      // Chime for new Lumia orders / bookings…
      const ids = new Set([...data.orders.map((o) => o.id), ...data.reservations.map((r) => `r:${r.id}`)]);
      let chime = !!known.current && [...ids].some((id) => !known.current!.has(id));
      known.current = ids;
      // …and once per booking when its shuttle pickup is 30 minutes away.
      for (const r of data.reservations) {
        const mins = r.needShuttle && !r.shuttleDoneAt ? minutesUntil(data.today, r.date, r.pickupTime, t) : null;
        if (mins !== null && mins <= SHUTTLE_ALERT_MIN && !alerted.current.has(r.id)) {
          alerted.current.add(r.id);
          chime = true;
        }
      }
      if (chime) playAlertSound();

      setOrders(data.orders);
      setReservations(data.reservations);
    } catch {
      setError(true);
    }
  }, 10_000);

  async function shuttle(id: string, done: boolean) {
    setBusy(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shuttleDone: done }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) setReservations((l) => l.map((r) => (r.id === id ? data.reservation : r)));
      else window.alert(data?.error ?? "Không cập nhật được.");
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff/login");
    router.refresh();
  }

  const shuttles = reservations
    .filter((r) => r.date === today && r.needShuttle && r.status !== "CANCELLED")
    .sort((a, b) => ((a.pickupTime ?? "") < (b.pickupTime ?? "") ? -1 : 1));
  const upcoming = reservations
    .filter((r) => !(r.date === today && r.needShuttle))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const roomOrders = [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="order-header">
        <div className="order-logo">LOUIS WINE × LUMIA</div>
        <h3 style={{ margin: 0 }}>Bảng lễ tân Lumia</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {role !== "RECEPTION" && (
            <Link href="/staff" className="btn btn-secondary">
              Màn hình nhân viên
            </Link>
          )}
          <span className="text-muted" style={{ fontSize: 13 }}>
            {username}
          </span>
          <button className="btn btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {error && (
          <div role="alert" style={{ background: "var(--color-accent)", color: "#fff", padding: "var(--space-2) var(--space-3)", fontWeight: 700 }}>
            ⚠ Mất kết nối — đang thử lại. Gọi nhà hàng 0789 94 93 93 nếu cần gấp.
          </div>
        )}
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
          Bấm vào trang một lần sau khi mở để bật âm thanh. Chuông kêu khi có đơn/đặt bàn Lumia mới và {SHUTTLE_ALERT_MIN} phút trước giờ xe đón.
        </p>

        <section>
          <h3>🚐 Xe đón hôm nay ({shuttles.length})</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {shuttles.map((r) => {
              const mins = minutesUntil(today, r.date, r.pickupTime, now);
              const done = !!r.shuttleDoneAt;
              const soon = !done && mins !== null && mins <= SHUTTLE_ALERT_MIN && mins >= 0;
              const late = !done && mins !== null && mins < 0;
              return (
                <div
                  key={r.id}
                  style={{
                    border: `2px solid ${late ? "#c0141c" : soon ? "var(--color-accent-2-500)" : "var(--color-divider)"}`,
                    background: done ? "var(--color-neutral-200)" : soon ? "var(--color-accent-2-100)" : "var(--color-neutral-100)",
                    padding: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 22 }}>{r.pickupTime}</span>
                    <span style={{ fontWeight: 700, color: late ? "#c0141c" : "inherit" }}>
                      {done ? "✓ Đã đón" : mins === null ? "" : mins >= 0 ? `còn ${mins} phút` : `trễ ${-mins} phút`}
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Phòng {r.hotelRoom}</div>
                  <div>
                    {r.customerName} · {r.guests} khách ·{" "}
                    <a href={`tel:${r.phone}`} style={{ color: "var(--color-accent)", fontWeight: 700 }}>
                      {r.phone}
                    </a>
                  </div>
                  <div className="text-muted">
                    Bàn lúc {r.time} · {r.status === "NEW" ? "⚠ nhà hàng chưa xác nhận" : "nhà hàng đã xác nhận"}
                  </div>
                  {r.note && <div>📝 {r.note}</div>}
                  {done ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="text-muted">
                        {formatTime(r.shuttleDoneAt!)} · {r.shuttleDoneBy}
                      </span>
                      <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={busy === r.id} onClick={() => shuttle(r.id, false)}>
                        Hoàn tác
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-primary" disabled={busy === r.id} onClick={() => shuttle(r.id, true)}>
                      Xe đã đón khách
                    </button>
                  )}
                </div>
              );
            })}
            {shuttles.length === 0 && <p className="text-muted">Hôm nay không có lượt xe đón nào.</p>}
          </div>
        </section>

        <hr className="hr" />

        <section>
          <h3>🛎 Đơn giao về phòng (2 ngày gần đây)</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Giờ đặt</th>
                <th>Phòng</th>
                <th>Khách</th>
                <th>Món</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {roomOrders.map((o) => {
                const st = orderStage(o);
                return (
                  <tr key={o.id}>
                    <td>{formatTime(o.createdAt)}</td>
                    <td style={{ fontWeight: 800 }}>{o.online?.hotelRoom}</td>
                    <td>
                      {o.online?.customerName}
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {o.online?.phone}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{o.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ")}</td>
                    <td style={{ fontWeight: 700, color: st.color }}>{st.label}</td>
                    <td>
                      {formatVnd(o.totalAmount)}
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {o.paidAt ? `✓ đã thu (${o.paymentMethod === "TRANSFER" ? "CK" : "tiền mặt"})` : "chưa thu"}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {roomOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted">
                    Chưa có đơn giao về phòng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <hr className="hr" />

        <section>
          <h3>🍷 Đặt bàn khác của khách Lumia</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Ngày giờ</th>
                <th>Phòng</th>
                <th>Khách</th>
                <th>Xe đón</th>
                <th>Nhà hàng</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.time}</b> · {r.date.split("-").reverse().join("/")}
                  </td>
                  <td style={{ fontWeight: 800 }}>{r.hotelRoom}</td>
                  <td>
                    {r.customerName} · {r.guests} khách
                  </td>
                  <td>{r.needShuttle ? `🚐 ${r.pickupTime}` : "—"}</td>
                  <td>{r.status === "NEW" ? "Chờ xác nhận" : r.status === "CONFIRMED" ? "Đã xác nhận" : r.status === "SEATED" ? "Khách đã đến" : "Hoàn tất"}</td>
                </tr>
              ))}
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Không có lượt đặt bàn nào khác.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
