"use client";

import { Fragment } from "react";
import { formatQty, formatVnd } from "@/lib/format";
import { COMPANY, RESTAURANT } from "@/lib/site/constants";
import { mergeBillLines } from "@/lib/bill-lines";
import { BILL_GROUPS, BILL_GROUP_LABEL, billLineCompKey } from "@/lib/bill-math";
import { vndInWords } from "@/lib/vnd-words";
import type { FinalizedBill } from "@/lib/billing";
import type { TransferAccount } from "./TransferQr";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatHm(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
/** "13:03", or "13:03 09/10" when the guest sat down on an earlier day than the bill is printed. */
function formatCheckIn(checkIn: string | null, printedAt: string): string {
  if (!checkIn) return "—";
  const sameDay = formatDate(checkIn) === formatDate(printedAt);
  return sameDay ? formatHm(checkIn) : `${formatHm(checkIn)} ${formatDate(checkIn).slice(0, 5)}`;
}

/**
 * A5 printed bill: logo + company/restaurant identity, bill meta, items (the same
 * dish ordered in several rounds merged into one line), totals with the amount
 * in words, and how it was paid. Paid by transfer → the VietQR (exact amount + note)
 * is printed too, so the guest can scan it from the paper bill.
 * VAT here is for internal use; an official VAT e-invoice is issued separately.
 */
export default function InvoicePrint({
  bill,
  printedByLabel,
  transfer = null,
  provisional = false,
}: {
  bill: FinalizedBill;
  printedByLabel: string;
  transfer?: { account: TransferAccount; note: string; qrSrc: string } | null;
  /** "Phiếu tạm tính": the running bill printed before the guest pays — no bill number, no payment method, no QR. */
  provisional?: boolean;
}) {
  const lines = mergeBillLines(bill.items);
  const compedKeys = new Set(bill.compedKeys);
  // Dishes first, then drinks, then the rest; numbering (TT) runs on across the sections.
  const sections = BILL_GROUPS.map((g) => ({ group: g, rows: lines.filter((l) => l.group === g) })).filter((s) => s.rows.length > 0);
  let rowNo = 0;
  const paidBy =
    bill.paymentMethod === "TRANSFER"
      ? `Chuyển khoản${bill.bankAccountLabel ? ` — ${bill.bankAccountLabel}` : ""}`
      : "Tiền mặt";

  return (
    <div className="invoice-print">
      <style jsx global>{`
        @page {
          size: A5;
          margin: 7mm;
        }
      `}</style>

      {/* Large faint logo behind the bill (repeated on every printed page). */}
      <img src="/images/logo.png" alt="" aria-hidden className="inv-watermark" />

      <div className="inv-head">
        <img src="/images/logo.png" alt="Louis" className="inv-logo" />
        <div className="inv-company">
          <div className="inv-brand">{COMPANY.restaurantName}</div>
          <div className="inv-legal">{COMPANY.legalName}</div>
          <div>MST: {COMPANY.taxCode}</div>
          <div>Đ/c: {RESTAURANT.address}</div>
          <div>
            Hotline: <b>{RESTAURANT.hotline.replace(/\s/g, ".")}</b>
          </div>
        </div>
      </div>

      <div className="inv-title">{provisional ? "PHIẾU TẠM TÍNH" : "HÓA ĐƠN THANH TOÁN"}</div>
      {!provisional && <div className="inv-billno">Số: {bill.billNo}</div>}

      <table className="invoice-meta">
        <tbody>
          <tr>
            <td>
              Bàn: <b>{bill.tableLabel}</b>
            </td>
            <td>Ngày: {formatDate(bill.printedAt)}</td>
          </tr>
          <tr>
            <td>Giờ vào: {formatCheckIn(bill.checkInAt, bill.printedAt)}</td>
            <td>Giờ ra: {formatHm(bill.printedAt)}</td>
          </tr>
          <tr>
            <td>Số khách: {bill.guestCount ?? "—"}</td>
            <td>Thu ngân: {printedByLabel}</td>
          </tr>
        </tbody>
      </table>
      {bill.customerName && (
        <div className="inv-customer">
          Khách hàng: <b>{bill.customerName}</b>
        </div>
      )}

      <table className="invoice-items">
        <thead>
          <tr>
            <th>TT</th>
            <th style={{ textAlign: "left" }}>Tên món</th>
            <th>SL</th>
            <th>ĐVT</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
            <th>VAT</th>
            <th>Tiền thuế</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <Fragment key={s.group}>
              <tr className="inv-group">
                <td colSpan={8}>{BILL_GROUP_LABEL[s.group]}</td>
              </tr>
              {s.rows.map((l) => {
                const comped = compedKeys.has(billLineCompKey(l));
                return (
                  <tr key={`${s.group}-${rowNo}`}>
                    <td style={{ textAlign: "center" }}>{++rowNo}</td>
                    <td>
                      {l.name}
                      {comped && <span style={{ marginLeft: 4, fontStyle: "italic" }}>(Mời)</span>}
                    </td>
                    <td style={{ textAlign: "center" }}>{formatQty(l.qty)}</td>
                    <td style={{ textAlign: "center" }}>{l.unit || "phần"}</td>
                    <td style={{ textAlign: "right" }}>{formatVnd(l.unitPrice)}</td>
                    <td style={{ textAlign: "right" }}>{comped ? "Miễn phí" : formatVnd(l.lineTotal)}</td>
                    <td style={{ textAlign: "center" }}>{l.vatRate}%</td>
                    <td style={{ textAlign: "right" }}>{comped ? formatVnd(0) : formatVnd(Math.round((l.lineTotal * l.vatRate) / 100))}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>

      <table className="invoice-totals">
        <tbody>
          <tr>
            {/* Only dishes that are charged: the sum of the "Thành tiền" column. "Mời" dishes read "Miễn phí" there,
                so the free dishes' list price is NOT added here and therefore nothing is subtracted afterwards. */}
            <td>Cộng tiền món</td>
            <td>{formatVnd(bill.subtotal - bill.compAmount)}</td>
          </tr>
          {bill.discountAmount > 0 && (
            <tr>
              <td>Chiết khấu{bill.discountPercent ? ` (${bill.discountPercent}%)` : ""}</td>
              <td>-{formatVnd(bill.discountAmount)}</td>
            </tr>
          )}
          {bill.vatGroups.map((g) => (
            <tr key={g.rate}>
              <td>Thuế VAT {g.rate}%</td>
              <td>{formatVnd(g.amount)}</td>
            </tr>
          ))}
          {bill.vatGroups.length > 1 && (
            <tr>
              <td>Tổng tiền thuế</td>
              <td>{formatVnd(bill.totalVat)}</td>
            </tr>
          )}
          <tr className="invoice-grand-total">
            <td>TỔNG THANH TOÁN</td>
            <td>{formatVnd(bill.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
      <div className="inv-words">Bằng chữ: {vndInWords(bill.totalAmount)}</div>
      {bill.compAmount > 0 && (
        <div className="inv-note">
          Món đánh dấu “(Mời)” miễn phí, không tính tiền và không tính thuế VAT (giá trị món mời: {formatVnd(bill.compAmount)}).
        </div>
      )}
      {provisional ? (
        <div className="inv-provisional">PHIẾU TẠM TÍNH — CHƯA PHẢI HOÁ ĐƠN THANH TOÁN</div>
      ) : (
        <div className="inv-paid">Hình thức thanh toán: {paidBy}</div>
      )}

      {transfer && (
        <div className="inv-qr">
          <img src={transfer.qrSrc} alt="Mã QR chuyển khoản" className="inv-qr-img" />
          <div className="inv-qr-info">
            <div className="inv-qr-title">Quét mã để chuyển khoản</div>
            <div>{transfer.account.bank}</div>
            <div>
              STK: <b>{transfer.account.number}</b>
            </div>
            <div>Chủ TK: {transfer.account.holder}</div>
            <div>
              Số tiền: <b>{formatVnd(bill.totalAmount)}</b>
            </div>
            <div>Nội dung: {transfer.note}</div>
          </div>
        </div>
      )}

      <div className="inv-thanks">Cảm ơn Quý khách. Hẹn gặp lại!</div>
    </div>
  );
}
