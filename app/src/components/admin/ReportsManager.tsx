"use client";

import { useEffect, useMemo, useState } from "react";
import { formatVnd } from "@/lib/format";

type Preset = "today" | "7d" | "month" | "year" | "custom";

type ReportData = {
  totalRevenue: number;
  orderCount: number;
  byDay: { date: string; revenue: number; orderCount: number }[];
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function toDateInputValue(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}
function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

const PRESET_LABELS: Record<Preset, string> = {
  today: "Hôm nay",
  "7d": "7 ngày qua",
  month: "Tháng này",
  year: "Năm nay",
  custom: "Tuỳ chỉnh",
};

export default function ReportsManager() {
  const now = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState(toDateInputValue(now));
  const [customTo, setCustomTo] = useState(toDateInputValue(now));
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    const today = new Date();
    switch (preset) {
      case "today":
        return { from: startOfDay(today), to: endOfDay(today) };
      case "7d": {
        const from = new Date(today);
        from.setDate(from.getDate() - 6);
        return { from: startOfDay(from), to: endOfDay(today) };
      }
      case "month": {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: startOfDay(from), to: endOfDay(today) };
      }
      case "year": {
        const from = new Date(today.getFullYear(), 0, 1);
        return { from: startOfDay(from), to: endOfDay(today) };
      }
      case "custom": {
        const from = customFrom ? new Date(customFrom + "T00:00:00") : startOfDay(today);
        const to = customTo ? new Date(customTo + "T23:59:59.999") : endOfDay(today);
        return { from, to };
      }
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/reports/revenue?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Không tải được báo cáo.");
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const maxDayRevenue = data ? Math.max(1, ...data.byDay.map((d) => d.revenue)) : 1;
  const avgPerOrder = data && data.orderCount > 0 ? Math.round(data.totalRevenue / data.orderCount) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 720 }}>
      <h3>Doanh thu</h3>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
          <button key={p} className={`btn ${preset === p ? "btn-primary" : "btn-secondary"}`} onClick={() => setPreset(p)}>
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field">
            <label>Từ ngày</label>
            <input className="input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>Đến ngày</label>
            <input className="input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        </div>
      )}

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
      {loading && <p className="text-muted">Đang tải...</p>}

      {data && !loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            <div style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", padding: "var(--space-3)" }}>
              <div className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tổng doanh thu
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 22, color: "var(--color-accent)" }}>
                {formatVnd(data.totalRevenue)}
              </div>
            </div>
            <div style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", padding: "var(--space-3)" }}>
              <div className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Số đơn đã xác nhận
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 22 }}>{data.orderCount}</div>
            </div>
            <div style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", padding: "var(--space-3)" }}>
              <div className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Trung bình / đơn
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 22 }}>{formatVnd(avgPerOrder)}</div>
            </div>
          </div>

          {data.byDay.length === 0 ? (
            <p className="text-muted">Không có đơn nào đã xác nhận trong khoảng thời gian này.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Số đơn</th>
                  <th>Doanh thu</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.byDay.map((d) => (
                  <tr key={d.date}>
                    <td>{formatDayLabel(d.date)}</td>
                    <td>{d.orderCount}</td>
                    <td style={{ fontWeight: 700 }}>{formatVnd(d.revenue)}</td>
                    <td style={{ width: 120 }}>
                      <div style={{ background: "var(--color-neutral-300)", height: 8 }}>
                        <div
                          style={{
                            background: "var(--color-accent)",
                            height: 8,
                            width: `${Math.round((d.revenue / maxDayRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="text-muted" style={{ fontSize: 12 }}>
            Chỉ tính các đơn đã được nhân viên xác nhận ("Đã xác nhận"). Đơn đang chờ hoặc đã huỷ không tính vào doanh thu.
          </p>
        </>
      )}
    </div>
  );
}
