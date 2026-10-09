"use client";

import { useEffect, useMemo, useState } from "react";
import { formatQty, formatVnd } from "@/lib/format";

type Return = {
  id: string;
  tableLabel: string;
  name: string;
  qty: number;
  value: number;
  returnedAt: string;
  returnedBy: string;
  note: string;
};

type Preset = "today" | "7d" | "month";
const PRESET_LABELS: Record<Preset, string> = { today: "Hôm nay", "7d": "7 ngày qua", month: "Tháng này" };

function rangeFor(preset: Preset): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (preset === "7d") from.setDate(from.getDate() - 6);
  if (preset === "month") from.setDate(1);
  return { from, to };
}

export default function ReturnsManager() {
  const [preset, setPreset] = useState<Preset>("today");
  const [rows, setRows] = useState<Return[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = rangeFor(preset);
    setRows(null);
    setError(null);
    fetch(`/api/orders/returns?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Không tải được danh sách.");
        if (!cancelled) setRows(data.returns);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [preset]);

  const byItem = useMemo(() => {
    const map = new Map<string, { qty: number; value: number }>();
    for (const r of rows ?? []) {
      const g = map.get(r.name) ?? { qty: 0, value: 0 };
      g.qty += r.qty;
      g.value += r.value;
      map.set(r.name, g);
    }
    return [...map.entries()].sort((a, b) => b[1].value - a[1].value);
  }, [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h3>Hàng khách trả lại {rows && <span className="tag tag-outline">{rows.length}</span>}</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -8 }}>
        Hàng chưa dùng khách trả lại trước khi thanh toán (bia chưa khui, rượu chưa mở, xì gà, khăn lạnh...) — đã trừ khỏi bill,
        hàng phải được nhập lại quầy bar/kho. Dùng bảng tổng theo mặt hàng để đối chiếu tồn kho cuối ca.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
          <button key={p} className={`btn ${preset === p ? "btn-primary" : "btn-secondary"}`} onClick={() => setPreset(p)}>
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
      {!rows && !error && <p className="text-muted">Đang tải...</p>}
      {rows && rows.length === 0 && <p className="text-muted">Không có hàng trả lại trong khoảng thời gian này.</p>}

      {rows && rows.length > 0 && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Mặt hàng</th>
                <th>Tổng SL trả lại</th>
                <th>Giá trị (giá bán)</th>
              </tr>
            </thead>
            <tbody>
              {byItem.map(([name, g]) => (
                <tr key={name}>
                  <td style={{ fontWeight: 700 }}>{name}</td>
                  <td>{formatQty(g.qty)}</td>
                  <td>{formatVnd(g.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Bàn</th>
                <th>Mặt hàng</th>
                <th>SL</th>
                <th>Giá trị</th>
                <th>Nhân viên ghi nhận</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.returnedAt).toLocaleString("vi-VN")}</td>
                  <td>{r.tableLabel}</td>
                  <td>{r.name}</td>
                  <td>{formatQty(r.qty)}</td>
                  <td>{formatVnd(r.value)}</td>
                  <td>{r.returnedBy}</td>
                  <td className="text-muted">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
