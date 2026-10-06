"use client";

import { useEffect, useMemo, useState } from "react";
import { formatVnd } from "@/lib/format";

type Cancellation = {
  id: string;
  tableId: string;
  tableLabel: string;
  floor: string | null;
  online: "PICKUP" | "DELIVERY" | "LUMIA_ROOM" | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  totalAmount: number;
};

type Preset = "month" | "7d" | "custom";
const PRESET_LABELS: Record<Preset, string> = { month: "Tháng này", "7d": "7 ngày qua", custom: "Tuỳ chỉnh" };
const CHANNEL_LABEL = { PICKUP: "Mang về", DELIVERY: "Giao tận nơi", LUMIA_ROOM: "Phòng Lumia" } as const;

function toDateInputValue(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

export default function CancellationsManager() {
  const [preset, setPreset] = useState<Preset>("month");
  const now = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState(toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(toDateInputValue(now));
  const [rows, setRows] = useState<Cancellation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    const today = new Date();
    if (preset === "month") return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    if (preset === "7d") {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }
    return {
      from: customFrom ? new Date(customFrom + "T00:00:00") : today,
      to: customTo ? new Date(customTo + "T23:59:59.999") : today,
    };
  }, [preset, customFrom, customTo]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(range.to);
      to.setHours(23, 59, 59, 999);
      const res = await fetch(`/api/orders/cancellations?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được danh sách.");
      setRows(data.cancellations);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from.getTime(), range.to.getTime()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h3>Đơn hàng bị huỷ {rows && <span className="tag tag-outline">{rows.length}</span>}</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -8 }}>
        Mỗi lần nhân viên bấm "Huỷ" trên đơn, lý do bắt buộc nhập và được ghi lại ở đây để đối chiếu.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
          <button key={p} className={`btn ${preset === p ? "btn-primary" : "btn-secondary"}`} onClick={() => setPreset(p)}>
            {PRESET_LABELS[p]}
          </button>
        ))}
        {preset === "custom" && (
          <>
            <input className="input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ width: 150 }} />
            <span>—</span>
            <input className="input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ width: 150 }} />
          </>
        )}
      </div>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
      {loading && <p className="text-muted">Đang tải...</p>}
      {!loading && rows && rows.length === 0 && <p className="text-muted">Không có đơn nào bị huỷ trong khoảng thời gian này.</p>}

      {!loading && rows && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Ngày giờ huỷ</th>
              <th>Tài khoản huỷ</th>
              <th>Bàn</th>
              <th>Tầng</th>
              <th>Lý do huỷ</th>
              <th>Giá trị đơn</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.cancelledAt)}</td>
                <td>{r.cancelledBy ?? "—"}</td>
                <td>{r.online ? CHANNEL_LABEL[r.online] : r.tableLabel}</td>
                <td className="text-muted">{r.floor ?? "—"}</td>
                <td>{r.cancelReason ?? "—"}</td>
                <td>{formatVnd(r.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
