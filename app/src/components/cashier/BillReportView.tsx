"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatVnd } from "@/lib/format";
import type { BillReport, MethodKey } from "@/lib/bill-report";

const METHOD_LABEL: Record<MethodKey, string> = {
  CASH: "Tiền mặt",
  TRANSFER_NO_INVOICE: "CK (không xuất HĐ)",
  TRANSFER_INVOICE: "CK (cần xuất HĐ)",
  TRANSFER: "Chuyển khoản",
};

type Mode = "day" | "week" | "custom";

const todayVN = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const dmy = (date: string) => date.split("-").reverse().join("/");
const time = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Monday of the week containing `date`. */
function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shift(date, dow === 0 ? -6 : 1 - dow);
}

export default function BillReportView({ username, role }: { username: string; role: string }) {
  const [mode, setMode] = useState<Mode>("day");
  const [anchor, setAnchor] = useState(todayVN());
  const [customFrom, setCustomFrom] = useState(shift(todayVN(), -6));
  const [customTo, setCustomTo] = useState(todayVN());
  const [report, setReport] = useState<BillReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [from, to] = useMemo(() => {
    if (mode === "day") return [anchor, anchor];
    if (mode === "week") return [weekStart(anchor), shift(weekStart(anchor), 6)];
    return [customFrom, customTo];
  }, [mode, anchor, customFrom, customTo]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetch(`/api/billing/report?from=${from}&to=${to}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error || "Không tải được báo cáo.");
        if (live) setReport(d);
      })
      .catch((e) => live && setError((e as Error).message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [from, to]);

  const s = report?.summary;
  const period = from === to ? dmy(from) : `${dmy(from)} – ${dmy(to)}`;
  const backHref = role === "CASHIER" ? "/thu-ngan" : "/admin/categories";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="order-header no-print">
        <div className="order-logo">LOUIS WINE</div>
        <h3 style={{ margin: 0 }}>Báo cáo hoá đơn</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/thu-ngan" className="btn btn-secondary">
            Màn hình thu ngân
          </Link>
          {role !== "CASHIER" && (
            <Link href={backHref} className="btn btn-secondary">
              Quay lại Quản trị
            </Link>
          )}
          <span className="text-muted" style={{ fontSize: 13 }}>
            {username}
          </span>
        </div>
      </header>

      <main style={{ flex: 1, padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          {(["day", "week", "custom"] as Mode[]).map((m) => (
            <button key={m} className={`btn ${mode === m ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode(m)}>
              {m === "day" ? "Theo ngày" : m === "week" ? "Theo tuần" : "Tuỳ chọn"}
            </button>
          ))}
          {mode !== "custom" ? (
            <>
              <button className="btn btn-secondary" onClick={() => setAnchor(shift(anchor, mode === "day" ? -1 : -7))}>
                ‹ Trước
              </button>
              <input className="input" type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} style={{ width: 160 }} />
              <button className="btn btn-secondary" onClick={() => setAnchor(shift(anchor, mode === "day" ? 1 : 7))}>
                Sau ›
              </button>
              <button className="btn btn-secondary" onClick={() => setAnchor(todayVN())}>
                {mode === "day" ? "Hôm nay" : "Tuần này"}
              </button>
            </>
          ) : (
            <>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 12 }}>Từ ngày</span>
                <input className="input" type="date" value={customFrom} onChange={(e) => e.target.value && setCustomFrom(e.target.value)} />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 12 }}>Đến ngày</span>
                <input className="input" type="date" value={customTo} onChange={(e) => e.target.value && setCustomTo(e.target.value)} />
              </label>
            </>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <a className="btn btn-primary" href={`/api/billing/report?from=${from}&to=${to}&format=xlsx`}>
              Tải Excel
            </a>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              In báo cáo
            </button>
          </div>
        </div>

        <h2 style={{ margin: 0 }}>Báo cáo hoá đơn · {period}</h2>
        {error && <div style={{ color: "var(--color-accent)" }}>{error}</div>}
        {loading && !report && <p className="text-muted">Đang tải...</p>}

        {s && report && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, opacity: loading ? 0.5 : 1 }}>
              {[
                ["Số hoá đơn", String(s.billCount)],
                ["Số khách", String(s.guests)],
                ["Tiền món", formatVnd(s.subtotal)],
                ["Chiết khấu", formatVnd(s.discount)],
                ["Thuế VAT", formatVnd(s.vat)],
                ["Thu hoá đơn", formatVnd(s.billsTotal)],
                ["Thu online", `${formatVnd(s.onlineTotal)} (${s.onlineCount} đơn)`],
                ["TỔNG THU", formatVnd(s.grandTotal)],
              ].map(([k, v]) => (
                <div key={k} style={{ border: "1px solid var(--color-divider)", padding: "var(--space-3)", background: "var(--color-neutral-100)" }}>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {k}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: k === "TỔNG THU" ? 20 : 16, color: k === "TỔNG THU" ? "var(--color-accent)" : undefined }}>{v}</div>
                </div>
              ))}
            </div>

            <section>
              <h3>Theo hình thức thanh toán (hoá đơn tại nhà hàng)</h3>
              <table className="table" style={{ maxWidth: 520 }}>
                <tbody>
                  {(Object.keys(METHOD_LABEL) as MethodKey[])
                    .filter((k) => k !== "TRANSFER" || s.byMethod.TRANSFER > 0)
                    .map((k) => (
                      <tr key={k}>
                        <td>{METHOD_LABEL[k]}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{formatVnd(s.byMethod[k])}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>

            {report.byDay.length > 1 && (
              <section>
                <h3>Theo ngày</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Số HĐ</th>
                      <th>Thu hoá đơn</th>
                      <th>Tiền mặt</th>
                      <th>Chuyển khoản</th>
                      <th>Thu online</th>
                      <th>Tổng thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byDay.map((d) => (
                      <tr key={d.date}>
                        <td>{dmy(d.date)}</td>
                        <td>{d.billCount}</td>
                        <td>{formatVnd(d.billsTotal)}</td>
                        <td>{formatVnd(d.cash)}</td>
                        <td>{formatVnd(d.transfer)}</td>
                        <td>{formatVnd(d.onlineTotal)}</td>
                        <td style={{ fontWeight: 700 }}>{formatVnd(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <section>
              <h3>Danh sách hoá đơn ({report.bills.length})</h3>
              {report.bills.length === 0 ? (
                <p className="text-muted">Không có hoá đơn nào trong kỳ này.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngày giờ</th>
                      <th>Số HĐ</th>
                      <th>Bàn</th>
                      <th>Thu ngân</th>
                      <th>Khách</th>
                      <th>Tiền món</th>
                      <th>Chiết khấu</th>
                      <th>VAT</th>
                      <th>Tổng thu</th>
                      <th>Hình thức</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bills.map((b) => (
                      <tr key={b.billNo}>
                        <td>
                          {dmy(b.date).slice(0, 5)} {time(b.paidAt)}
                        </td>
                        <td>
                          {b.billNo}
                          {b.legacy && (
                            <span className="text-muted" style={{ fontSize: 11 }} title="Hoá đơn in trước khi hệ thống lưu chiết khấu — VAT tính lại theo thuế suất hiện tại.">
                              {" "}
                              (cũ)
                            </span>
                          )}
                        </td>
                        <td>{b.table}</td>
                        <td>{b.cashier}</td>
                        <td>{b.guestCount ?? "—"}</td>
                        <td>{formatVnd(b.subtotal)}</td>
                        <td>{b.discount ? `-${formatVnd(b.discount)}` : "—"}</td>
                        <td>{formatVnd(b.vat)}</td>
                        <td style={{ fontWeight: 700 }}>{formatVnd(b.total)}</td>
                        <td>
                          {METHOD_LABEL[b.method]}
                          {b.account && (
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              {b.account}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {report.online.length > 0 && (
              <section>
                <h3>Đơn online đã thu tiền ({report.online.length})</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngày giờ</th>
                      <th>Mã đơn</th>
                      <th>Hình thức nhận</th>
                      <th>Khách</th>
                      <th>Người thu</th>
                      <th>Tổng thu</th>
                      <th>Thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.online.map((o) => (
                      <tr key={o.code}>
                        <td>
                          {dmy(o.date).slice(0, 5)} {time(o.paidAt)}
                        </td>
                        <td>{o.code}</td>
                        <td>{o.channel}</td>
                        <td>{o.customer}</td>
                        <td>{o.paidBy}</td>
                        <td style={{ fontWeight: 700 }}>{formatVnd(o.total)}</td>
                        <td>{METHOD_LABEL[o.method]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
