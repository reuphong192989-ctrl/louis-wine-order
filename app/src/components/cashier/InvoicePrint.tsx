"use client";

import { formatQty, formatVnd } from "@/lib/format";
import { COMPANY, RESTAURANT } from "@/lib/site/constants";
import { mergeBillLines } from "@/lib/bill-lines";
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
}: {
  bill: FinalizedBill;
  printedByLabel: string;
  transfer?: { account: TransferAccount; note: string; qrSrc: string } | null;
}) {
  const lines = mergeBillLines(bill.items);
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

      <div className="inv-title">HÓA ĐƠN THANH TOÁN</div>
      <div className="inv-billno">Số: {bill.billNo}</div>

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
          {lines.map((l, i) => (
            <tr key={i}>
              <td style={{ textAlign: "center" }}>{i + 1}</td>
              <td>{l.name}</td>
              <td style={{ textAlign: "center" }}>{formatQty(l.qty)}</td>
              <td style={{ textAlign: "center" }}>phần</td>
              <td style={{ textAlign: "right" }}>{formatVnd(l.unitPrice)}</td>
              <td style={{ textAlign: "right" }}>{formatVnd(l.lineTotal)}</td>
              <td style={{ textAlign: "center" }}>{l.vatRate}%</td>
              <td style={{ textAlign: "right" }}>{formatVnd(Math.round((l.lineTotal * l.vatRate) / 100))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="invoice-totals">
        <tbody>
          <tr>
            <td>Cộng tiền món</td>
            <td>{formatVnd(bill.subtotal)}</td>
          </tr>
          {bill.discountAmount > 0 && (
            <tr>
              <td>Chiết khấu</td>
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
      <div className="inv-paid">Hình thức thanh toán: {paidBy}</div>

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
