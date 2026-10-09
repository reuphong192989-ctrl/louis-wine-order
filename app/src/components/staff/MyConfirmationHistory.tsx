"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatQty, formatTime, formatVnd } from "@/lib/format";

type Row = {
  id: string;
  tableLabel: string;
  onlineCode: string | null;
  createdAt: string;
  confirmedAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  billNo: string | null;
  totalAmount: number;
  items: { name: string; qty: number; note: string | null }[];
};

function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

export default function MyConfirmationHistory({ username }: { username: string }) {
  const [date, setDate] = useState(todayVN);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetch(`/api/orders/my-confirmations?date=${date}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Không tải được lịch sử.");
        if (!cancelled) setRows(data.orders);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [date]);

  const active = (rows ?? []).filter((r) => r.status !== "CANCELLED");
  const itemCount = active.reduce((s, r) => s + r.items.reduce((n, it) => n + it.qty, 0), 0);
  const total = active.reduce((s, r) => s + r.totalAmount, 0);
  const isToday = date === todayVN();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="order-header">
        <div className="order-logo">LOUIS WINE</div>
        <h3 style={{ margin: 0 }}>Lịch sử xác nhận của tôi</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="text-muted" style={{ fontSize: 13 }}>{username}</span>
          <Link href="/staff" className="btn btn-secondary">
            ← Màn hình nhân viên
          </Link>
        </div>
      </header>

      <main className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => setDate((d) => shiftDate(d, -1))}>
            ← Hôm trước
          </button>
          <input className="input" type="date" value={date} max={todayVN()} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: "auto" }} />
          <button className="btn btn-secondary" disabled={isToday} onClick={() => setDate((d) => shiftDate(d, 1))}>
            Hôm sau →
          </button>
          {!isToday && (
            <button className="btn btn-ghost" onClick={() => setDate(todayVN())}>
              Hôm nay
            </button>
          )}
        </div>

        {rows && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Đơn đã xác nhận" value={String(active.length)} />
            <Stat label="Tổng số món" value={formatQty(itemCount)} />
            <Stat label="Tổng tiền món" value={formatVnd(total)} />
          </div>
        )}

        {error && <p style={{ color: "var(--color-accent)" }}>{error}</p>}
        {!rows && !error && <p className="text-muted">Đang tải...</p>}

        {rows && rows.length === 0 && (
          <p className="text-muted">{isToday ? "Hôm nay bạn chưa xác nhận đơn nào." : "Ngày này bạn không xác nhận đơn nào."}</p>
        )}

        {rows && rows.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Giờ xác nhận</th>
                <th>Bàn</th>
                <th>Món · số lượng</th>
                <th style={{ textAlign: "right" }}>Tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={r.status === "CANCELLED" ? { opacity: 0.55 } : undefined}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <b>{formatTime(r.confirmedAt)}</b>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      khách gọi {formatTime(r.createdAt)}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {r.tableLabel}
                    {r.onlineCode && <div className="text-muted" style={{ fontSize: 11, fontWeight: 400 }}>{r.onlineCode}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {r.items.map((it, i) => (
                      <div key={i}>
                        {it.name} × <b>{formatQty(it.qty)}</b>
                        {it.note && <span className="text-muted"> — {it.note}</span>}
                      </div>
                    ))}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatVnd(r.totalAmount)}</td>
                  <td style={{ fontSize: 12 }}>
                    {r.status === "CANCELLED" ? "Đã huỷ sau đó" : r.billNo ? `Đã thanh toán (${r.billNo})` : "Đang phục vụ"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "2px solid var(--color-divider)", background: "var(--color-neutral-100)", padding: "var(--space-2) var(--space-3)", minWidth: 150 }}>
      <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20, color: "var(--color-accent)" }}>{value}</div>
    </div>
  );
}
