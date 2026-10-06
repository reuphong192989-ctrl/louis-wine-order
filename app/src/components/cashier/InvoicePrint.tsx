"use client";

import { formatVnd } from "@/lib/format";
import { RESTAURANT } from "@/lib/site/constants";
import type { FinalizedBill } from "@/lib/billing";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatHm(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * A5 printable receipt, matching the restaurant's existing paper template (same
 * header/field layout as the Excel bill it replaces) — flat item list (no
 * Món ăn/Đồ uống/Khác grouping), VAT shown for internal use only, no QR (the
 * cashier hands that to the guest separately for payment).
 */
export default function InvoicePrint({ bill, printedByLabel }: { bill: FinalizedBill; printedByLabel: string }) {
  return (
    <div className="invoice-print">
      <style jsx global>{`
        @page {
          size: A5;
          margin: 8mm;
        }
      `}</style>
      <div style={{ textAlign: "center", fontWeight: 800 }}>HẦM RƯỢU LOUIS - ĐÀ NẴNG</div>
      <div style={{ textAlign: "center" }}>Hotline: {RESTAURANT.hotline.replace(/\s/g, ".")}</div>
      <div style={{ textAlign: "center" }}>Đ/c: {RESTAURANT.address}</div>
      <div style={{ textAlign: "center" }}>***</div>
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: 16, margin: "6px 0" }}>HÓA ĐƠN THANH TOÁN</div>

      <table className="invoice-meta">
        <tbody>
          <tr>
            <td>Số HĐ: {bill.billNo}</td>
            <td>TN: {printedByLabel}</td>
          </tr>
          <tr>
            <td>Bàn: {bill.tableLabel}</td>
            <td>Ngày: {formatDate(bill.printedAt)}</td>
          </tr>
          <tr>
            <td>SL khách: {bill.guestCount ?? "—"}</td>
            <td>
              Giờ Vào: {formatHm(bill.checkInAt)} · Giờ Ra: {formatHm(bill.printedAt)}
            </td>
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
            <th>Thuế suất</th>
            <th>Tiền thuế</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((l, i) => (
            <tr key={i}>
              <td style={{ textAlign: "center" }}>{i + 1}</td>
              <td>{l.name}</td>
              <td style={{ textAlign: "center" }}>{l.qty}</td>
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
            <td>Tổng cộng</td>
            <td>{formatVnd(bill.subtotal)}</td>
          </tr>
          {bill.discountAmount > 0 && (
            <tr>
              <td>Tiền chiết khấu</td>
              <td>-{formatVnd(bill.discountAmount)}</td>
            </tr>
          )}
          {bill.vatGroups.map((g) => (
            <tr key={g.rate}>
              <td>Tiền thuế (VAT) {g.rate}%</td>
              <td>{formatVnd(g.amount)}</td>
            </tr>
          ))}
          <tr>
            <td>Thành tiền VAT</td>
            <td>{formatVnd(bill.totalVat)}</td>
          </tr>
          <tr className="invoice-grand-total">
            <td>Thanh toán</td>
            <td>{formatVnd(bill.totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: "center", fontStyle: "italic", marginTop: 16 }}>Cám ơn Quý khách. Hẹn gặp lại!</div>
    </div>
  );
}
