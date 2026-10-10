import { appendRow, readAllRowsCached, cell } from "./core";

const TAB = "Bills";
// One row per bill finalized on the cashier screen (/thu-ngan) — the numbers printed on
// paper (discount, VAT, total), kept for the daily/weekly bill report. Orders only carry
// the bill number; the discount and the guest count live only here.
const HEADERS = [
  "billNo",
  "tableId",
  "tableLabel",
  "checkInAt",
  "paidAt",
  "cashier",
  "guestCount",
  "itemCount",
  "subtotal",
  "discount",
  "vat",
  "total",
  "method",
  "bankAccountKey",
  "bankAccountLabel",
  "orderIds",
];

export type BillRecord = {
  billNo: string;
  tableId: string;
  tableLabel: string;
  checkInAt: string | null;
  paidAt: string;
  cashier: string;
  guestCount: number | null;
  itemCount: number;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  method: "CASH" | "TRANSFER";
  bankAccountKey: "no_invoice" | "invoice" | null;
  bankAccountLabel: string | null;
  orderIds: string[];
};

function decode(v: Record<string, string>): BillRecord {
  return {
    billNo: v.billNo,
    tableId: v.tableId,
    tableLabel: v.tableLabel || v.tableId,
    checkInAt: cell.strOrNull(v.checkInAt ?? ""),
    paidAt: v.paidAt,
    cashier: v.cashier ?? "",
    guestCount: v.guestCount ? Number(v.guestCount) : null,
    itemCount: Number(v.itemCount) || 0,
    subtotal: cell.toInt(v.subtotal),
    discount: cell.toInt(v.discount),
    vat: cell.toInt(v.vat),
    total: cell.toInt(v.total),
    method: v.method === "TRANSFER" ? "TRANSFER" : "CASH",
    bankAccountKey: v.bankAccountKey === "invoice" || v.bankAccountKey === "no_invoice" ? v.bankAccountKey : null,
    bankAccountLabel: cell.strOrNull(v.bankAccountLabel ?? ""),
    orderIds: (v.orderIds ?? "").split(",").filter(Boolean),
  };
}

export async function appendBill(b: BillRecord): Promise<void> {
  await appendRow(TAB, HEADERS, {
    billNo: b.billNo,
    tableId: b.tableId,
    tableLabel: b.tableLabel,
    checkInAt: cell.str(b.checkInAt),
    paidAt: b.paidAt,
    cashier: b.cashier,
    guestCount: b.guestCount === null ? "" : String(b.guestCount),
    itemCount: String(b.itemCount),
    subtotal: cell.int(b.subtotal),
    discount: cell.int(b.discount),
    vat: cell.int(b.vat),
    total: cell.int(b.total),
    method: b.method,
    bankAccountKey: b.bankAccountKey ?? "",
    bankAccountLabel: b.bankAccountLabel ?? "",
    orderIds: b.orderIds.join(","),
  });
}

export async function listBills(): Promise<BillRecord[]> {
  const rows = await readAllRowsCached(TAB, 5_000);
  return rows.map((r) => decode(r.values)).filter((b) => b.billNo);
}
