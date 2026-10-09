"use client";

import { useEffect, useMemo, useState } from "react";
import { formatQty, formatVnd } from "@/lib/format";

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
  kind: "order" | "item";
  afterConfirm: boolean;
  confirmedBy: string | null;
  dishes: { name: string; qty: number; kitchenStatus: "PENDING" | "COOKING" | "DONE" }[];
  wasteValue: number;
  costBearer: "RESTAURANT" | "STAFF" | null;
  costBearerStaff: string | null;
};

/** Waste = dishes the kitchen had already started when cancelled, split by who bears the cost. */
function summarizeWaste(rows: Cancellation[]) {
  let total = 0;
  let restaurant = 0;
  let unassigned = 0;
  const byStaff = new Map<string, number>();
  for (const r of rows) {
    if (!r.wasteValue) continue;
    total += r.wasteValue;
    if (r.costBearer === "STAFF" && r.costBearerStaff) byStaff.set(r.costBearerStaff, (byStaff.get(r.costBearerStaff) ?? 0) + r.wasteValue);
    else if (r.costBearer === "RESTAURANT") restaurant += r.wasteValue;
    else unassigned += r.wasteValue;
  }
  return { total, restaurant, unassigned, byStaff: [...byStaff.entries()].sort((a, b) => b[1] - a[1]) };
}

const KITCHEN_LABEL = { PENDING: "chưa làm", COOKING: "đang làm", DONE: "đã xong" } as const;

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
        Mỗi lần nhân viên bấm "Huỷ" trên đơn, lý do bắt buộc nhập và được ghi lại ở đây để đối chiếu. Gồm cả đơn bị huỷ
        sau khi đã xác nhận (đã báo bếp) và từng món khách trả lại — kèm trạng thái bếp lúc huỷ để đối chiếu chi phí.
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

      {!loading && rows && rows.length > 0 && (() => {
        const w = summarizeWaste(rows);
        return (
          <div style={{ border: "2px solid var(--color-divider)", background: "var(--color-neutral-100)", padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Chi phí hao hụt — món bếp đã làm nhưng bị huỷ: {formatVnd(w.total)}</div>
            <div style={{ fontSize: 13 }}>
              🏠 Nhà hàng chịu: <b>{formatVnd(w.restaurant)}</b>
              {w.byStaff.map(([u, v]) => (
                <span key={u}>
                  {" "}· 👤 {u} chịu: <b>{formatVnd(v)}</b>
                </span>
              ))}
              {w.unassigned > 0 && <span className="text-muted"> · Chưa phân bổ (dữ liệu cũ): {formatVnd(w.unassigned)}</span>}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>Tính theo giá bán trên menu. Món huỷ khi bếp chưa làm không tính hao hụt.</div>
          </div>
        );
      })()}

      {!loading && rows && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Ngày giờ huỷ</th>
              <th>Tài khoản huỷ</th>
              <th>Bàn</th>
              <th>Tầng</th>
              <th>Loại</th>
              <th>Món huỷ · bếp lúc huỷ</th>
              <th>Lý do huỷ</th>
              <th>Giá trị huỷ</th>
              <th>Hao hụt · ai chịu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.cancelledAt)}</td>
                <td>{r.cancelledBy ?? "—"}</td>
                <td>{r.online ? CHANNEL_LABEL[r.online] : r.tableLabel}</td>
                <td className="text-muted">{r.floor ?? "—"}</td>
                <td style={{ fontSize: 12 }}>
                  {r.kind === "item" ? "Huỷ món" : "Cả đơn"}
                  <div className="text-muted">{r.afterConfirm ? `sau khi xác nhận${r.confirmedBy ? ` (${r.confirmedBy})` : ""}` : "trước khi xác nhận"}</div>
                </td>
                <td style={{ fontSize: 12 }}>
                  {r.dishes.map((d, i) => (
                    <div key={i} style={{ color: d.kitchenStatus !== "PENDING" ? "var(--color-accent)" : undefined }}>
                      {d.name} × {formatQty(d.qty)}
                      {r.afterConfirm && <span className="text-muted"> · {KITCHEN_LABEL[d.kitchenStatus]}</span>}
                    </div>
                  ))}
                </td>
                <td>{r.cancelReason ?? "—"}</td>
                <td>{formatVnd(r.totalAmount)}</td>
                <td style={{ fontSize: 12 }}>
                  {r.wasteValue > 0 ? (
                    <>
                      <b style={{ color: "var(--color-accent)" }}>{formatVnd(r.wasteValue)}</b>
                      <div>
                        {r.costBearer === "STAFF" ? `Nhân viên: ${r.costBearerStaff}` : r.costBearer === "RESTAURANT" ? "Nhà hàng" : "Chưa phân bổ"}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
