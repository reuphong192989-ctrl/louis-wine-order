"use client";

import { useState } from "react";
import { usePolling } from "@/lib/use-polling";

type Reservation = {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  area: string | null;
  occasion: string | null;
  isLumiaGuest: boolean;
  hotelRoom: string | null;
  roomVerified: boolean;
  needShuttle: boolean;
  pickupTime: string | null;
  note: string | null;
  status: "NEW" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  handledBy: string | null;
};

const STATUS_LABEL: Record<Reservation["status"], string> = {
  NEW: "Mới",
  CONFIRMED: "Đã xác nhận",
  SEATED: "Đã đến",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
};

function todayVN() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

/** Website table bookings (incl. Lumia shuttle pickups). `lumiaOnly` is the Lumia reception view. */
export default function ReservationsManager({ lumiaOnly = false }: { lumiaOnly?: boolean }) {
  const [list, setList] = useState<Reservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  usePolling(async () => {
    try {
      const res = await fetch("/api/reservations", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được danh sách đặt bàn.");
      setList(data.reservations);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, 15_000);

  async function setStatus(id: string, status: Reservation["status"]) {
    setBusy(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại.");
      setList((l) => l?.map((r) => (r.id === id ? data.reservation : r)) ?? l);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!list) return error ? <div style={{ color: "var(--color-accent)" }}>{error}</div> : <p className="text-muted">Đang tải...</p>;

  const today = todayVN();
  const scoped = lumiaOnly ? list.filter((r) => r.isLumiaGuest) : list;
  const visible = scoped
    .filter((r) => showPast || r.date >= today)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const todayCount = scoped.filter((r) => r.date === today && r.status !== "CANCELLED");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{lumiaOnly ? "Đặt bàn & xe đón — khách Lumia" : "Đặt bàn từ website"}</h3>
        <span className="text-muted" style={{ fontSize: 13 }}>
          Hôm nay: {todayCount.length} bàn · {todayCount.reduce((s, r) => s + r.guests, 0)} khách ·{" "}
          {todayCount.filter((r) => r.needShuttle).length} lượt xe đón
        </span>
        <label style={{ marginLeft: "auto", fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Hiện cả ngày đã qua
        </label>
      </div>
      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Ngày giờ</th>
            <th>Khách</th>
            <th>Chi tiết</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id} style={r.status === "NEW" ? { background: "var(--color-accent-100)" } : undefined}>
              <td style={{ whiteSpace: "nowrap" }}>
                <b>{r.time}</b> · {r.date.split("-").reverse().join("/")}
                <div className="text-muted" style={{ fontSize: 12 }}>{r.code}</div>
              </td>
              <td>
                <b>{r.customerName}</b> · {r.guests} khách
                <div>
                  <a href={`tel:${r.phone}`} style={{ color: "var(--color-accent)" }}>{r.phone}</a>
                </div>
              </td>
              <td style={{ fontSize: 13 }}>
                {[r.area, r.occasion && `🎉 ${r.occasion}`].filter(Boolean).join(" · ")}
                {r.isLumiaGuest && (
                  <div style={{ fontWeight: 700 }}>
                    Lumia phòng {r.hotelRoom} {r.roomVerified ? "✓ QR" : "⚠ cần xác minh"} · -10%
                    {r.needShuttle && <> · 🚐 đón lúc {r.pickupTime}</>}
                  </div>
                )}
                {r.note && <div>📝 {r.note}</div>}
              </td>
              <td>
                <select
                  className="input"
                  value={r.status}
                  disabled={busy === r.id}
                  onChange={(e) => setStatus(r.id, e.target.value as Reservation["status"])}
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {r.handledBy && <div className="text-muted" style={{ fontSize: 11 }}>bởi {r.handledBy}</div>}
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted">Chưa có lượt đặt bàn nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
