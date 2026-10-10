"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatQty, formatTime, formatVnd } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import InvoicePrint from "./InvoicePrint";
import TransferQr, { useVietQr } from "./TransferQr";
import { mergeBillLines } from "@/lib/bill-lines";
import type { TableBillPreview, FinalizedBill } from "@/lib/billing";

type OpenTable = { tableId: string; tableLabel: string; orderCount: number; itemCount: number; total: number; oldestCreatedAt: string };
type BankAccount = { bank: string; number: string; holder: string } | null;
type BankAccounts = { noInvoice: BankAccount; invoice: BankAccount };

function BankAccountCard({ info, tag }: { info: BankAccount; tag: string }) {
  if (!info) return <span className="text-muted">Chưa cấu hình ({tag})</span>;
  return (
    <span>
      {info.bank} · <b>{info.number}</b> · {info.holder}
    </span>
  );
}

export default function CashierBoard({ username, role }: { username: string; role: string }) {
  const router = useRouter();
  const [tables, setTables] = useState<OpenTable[] | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TableBillPreview | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccounts | null>(null);
  const [guestCount, setGuestCount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [bankAccountKey, setBankAccountKey] = useState<"no_invoice" | "invoice" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizedBill, setFinalizedBill] = useState<FinalizedBill | null>(null);

  usePolling(async () => {
    if (finalizedBill) return; // don't refresh the worklist out from under an in-progress print
    const res = await fetch("/api/billing/open-tables", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/staff/login");
      return;
    }
    if (res.ok) setTables((await res.json()).tables);
  }, 5_000);

  useEffect(() => {
    fetch("/api/bank-accounts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setBankAccounts(d))
      .catch(() => {});
  }, []);

  async function openTable(tableId: string) {
    setSelectedTableId(tableId);
    setPreview(null);
    setError(null);
    setGuestCount("");
    setDiscountAmount("");
    setMethod("CASH");
    setBankAccountKey(null);
    const res = await fetch(`/api/billing/table/${encodeURIComponent(tableId)}`);
    const data = await res.json().catch(() => null);
    if (res.ok) setPreview(data.bill);
    else setError(data?.error ?? "Không tải được hoá đơn bàn này.");
  }

  async function confirmAndPrint() {
    if (!selectedTableId) return;
    if (method === "TRANSFER" && !bankAccountKey) {
      setError("Vui lòng chọn tài khoản nhận chuyển khoản.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const account = bankAccountKey && bankAccounts ? (bankAccountKey === "invoice" ? bankAccounts.invoice : bankAccounts.noInvoice) : null;
      const bankAccountLabel =
        method === "TRANSFER" && account
          ? `${account.bank.split(" - ")[0]} · ${account.number}${bankAccountKey === "invoice" ? " (xuất hoá đơn)" : ""}`
          : null;
      const res = await fetch(`/api/billing/table/${encodeURIComponent(selectedTableId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestCount: guestCount.trim() ? Number(guestCount) : null,
          discountAmount: discountAmount.trim() ? Number(discountAmount) : 0,
          method,
          bankAccountKey: method === "TRANSFER" ? bankAccountKey : null,
          bankAccountLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lập được hoá đơn.");
      setFinalizedBill(data.bill);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function backToWorklist() {
    setFinalizedBill(null);
    setSelectedTableId(null);
    setPreview(null);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff/login");
    router.refresh();
  }

  const selectedAccount =
    method === "TRANSFER" && bankAccountKey && bankAccounts ? (bankAccountKey === "invoice" ? bankAccounts.invoice : bankAccounts.noInvoice) : null;
  const discountValue = Math.max(0, Number(discountAmount) || 0);
  const payable = preview ? Math.max(0, preview.subtotal - discountValue + preview.totalVat) : 0;

  // Paid by transfer → the same VietQR shown on screen is also printed on the paper bill.
  const paidAccount =
    finalizedBill?.paymentMethod === "TRANSFER" && finalizedBill.bankAccountKey && bankAccounts
      ? finalizedBill.bankAccountKey === "invoice"
        ? bankAccounts.invoice
        : bankAccounts.noInvoice
      : null;
  const transferNote = finalizedBill ? `${finalizedBill.billNo} Ban ${finalizedBill.tableLabel}` : "";
  const printQr = useVietQr(paidAccount, finalizedBill?.totalAmount ?? 0, transferNote);
  const qrPending = !!paidAccount && !!printQr.bin && !printQr.src;

  if (finalizedBill) {
    return (
      <div>
        <div className="no-print" style={{ display: "flex", gap: 8, padding: "var(--space-4)", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={qrPending}>
            {qrPending ? "Đang tạo mã QR..." : "In hoá đơn (A5)"}
          </button>
          <button className="btn btn-secondary" onClick={backToWorklist}>
            Xong, quay lại
          </button>
        </div>
        {paidAccount && (
          <div className="no-print" style={{ display: "flex", justifyContent: "center", padding: "0 var(--space-4) var(--space-4)" }}>
            <TransferQr
              account={paidAccount}
              amount={finalizedBill.totalAmount}
              note={transferNote}
              title={finalizedBill.bankAccountKey === "invoice" ? "Chuyển khoản — có xuất hoá đơn" : "Chuyển khoản"}
            />
          </div>
        )}
        <InvoicePrint
          bill={finalizedBill}
          printedByLabel={username}
          transfer={paidAccount && printQr.src ? { account: paidAccount, note: transferNote, qrSrc: printQr.src } : null}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="order-header no-print">
        <div className="order-logo">LOUIS WINE</div>
        <h3 style={{ margin: 0 }}>Màn hình thu ngân</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {username} ({role === "OWNER" ? "Chủ sở hữu" : role === "ADMIN" ? "Quản lý" : role === "CASHIER" ? "Thu ngân" : "Nhân viên"})
          </span>
          <button className="btn btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="scroll-y no-print" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", display: "flex", gap: "var(--space-4)" }}>
        <section style={{ flex: "1 1 280px", minWidth: 260 }}>
          <h3>Bàn chờ thanh toán {tables && <span className="tag tag-outline">{tables.length}</span>}</h3>
          {tables === null && <p className="text-muted">Đang tải...</p>}
          {tables && tables.length === 0 && <p className="text-muted">Không có bàn nào đang chờ thanh toán.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tables?.map((t) => (
              <button
                key={t.tableId}
                type="button"
                onClick={() => openTable(t.tableId)}
                style={{
                  textAlign: "left",
                  border: `2px solid ${selectedTableId === t.tableId ? "var(--color-accent)" : "var(--color-divider)"}`,
                  background: selectedTableId === t.tableId ? "var(--color-accent-100)" : "var(--color-neutral-100)",
                  padding: "var(--space-3)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                  <span>Bàn {t.tableLabel}</span>
                  <span>{formatVnd(t.total)}</span>
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {t.orderCount} đơn · {t.itemCount} món · từ {formatTime(t.oldestCreatedAt)}
                </div>
              </button>
            ))}
          </div>
        </section>

        {selectedTableId && (
          <section style={{ flex: "2 1 360px", minWidth: 320 }}>
            <h3>Bàn {preview?.tableLabel ?? selectedTableId}</h3>
            {!preview && !error && <p className="text-muted">Đang tải...</p>}
            {error && <div style={{ color: "var(--color-accent)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
            {preview && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Món</th>
                      <th>SL</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergeBillLines(preview.items).map((l, i) => (
                      <tr key={i}>
                        <td>{l.name}</td>
                        <td>{formatQty(l.qty)}</td>
                        <td>{formatVnd(l.unitPrice)}</td>
                        <td>{formatVnd(l.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tiền món</span>
                    <span>{formatVnd(preview.subtotal)}</span>
                  </div>
                  {discountValue > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Chiết khấu</span>
                      <span>-{formatVnd(discountValue)}</span>
                    </div>
                  )}
                  {preview.vatGroups.map((g) => (
                    <div key={g.rate} style={{ display: "flex", justifyContent: "space-between" }} className="text-muted">
                      <span>VAT {g.rate}%</span>
                      <span>{formatVnd(g.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, color: "var(--color-accent)" }}>
                    <span>Khách thanh toán</span>
                    <span>{formatVnd(payable)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div className="field" style={{ width: 120 }}>
                    <label>SL khách</label>
                    <input className="input" type="number" min={0} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
                  </div>
                  <div className="field" style={{ width: 160 }}>
                    <label>Tiền chiết khấu</label>
                    <input className="input" type="number" min={0} value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label>Phương thức thanh toán</label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="radio" checked={method === "CASH"} onChange={() => setMethod("CASH")} /> Tiền mặt
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="radio" checked={method === "TRANSFER"} onChange={() => setMethod("TRANSFER")} /> Chuyển khoản
                    </label>
                  </div>
                </div>

                {method === "TRANSFER" && (
                  <div className="field">
                    <label>Tài khoản nhận chuyển khoản</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="radio" checked={bankAccountKey === "no_invoice"} onChange={() => setBankAccountKey("no_invoice")} />
                        Không xuất hoá đơn: <BankAccountCard info={bankAccounts?.noInvoice ?? null} tag="không xuất hoá đơn" />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="radio" checked={bankAccountKey === "invoice"} onChange={() => setBankAccountKey("invoice")} />
                        Cần xuất hoá đơn: <BankAccountCard info={bankAccounts?.invoice ?? null} tag="cần xuất hoá đơn" />
                      </label>
                    </div>
                  </div>
                )}

                {selectedAccount && (
                  <TransferQr
                    account={selectedAccount}
                    amount={payable}
                    note={`Thanh toan ban ${preview.tableLabel}`}
                    title={bankAccountKey === "invoice" ? "Quét để chuyển khoản — có xuất hoá đơn" : "Quét để chuyển khoản"}
                  />
                )}
                {method === "TRANSFER" && (
                  <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
                    Cho khách quét mã trên màn hình. Chỉ bấm &quot;Xác nhận &amp; In hoá đơn&quot; sau khi đã thấy tiền về tài khoản.
                  </p>
                )}

                <button className="btn btn-primary" disabled={busy} onClick={confirmAndPrint}>
                  {busy ? "Đang lập hoá đơn..." : "Xác nhận & In hoá đơn"}
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
