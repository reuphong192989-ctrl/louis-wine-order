import { listOrders } from "./sheets/orders";
import { listBills } from "./sheets/bills";
import { listTableNames } from "./sheets/tableNames";
import { vatRateByMenuItemId } from "./billing";
import { buildXlsx } from "./xlsx-lite";

/**
 * Daily / weekly bill report for managers and cashiers (/thu-ngan/bao-cao):
 * every bill finalized on the cashier screen plus website orders marked paid,
 * between two Vietnam-time dates (inclusive).
 */

export type MethodKey = "CASH" | "TRANSFER_NO_INVOICE" | "TRANSFER_INVOICE" | "TRANSFER";

export const METHOD_LABEL: Record<MethodKey, string> = {
  CASH: "Tiền mặt",
  TRANSFER_NO_INVOICE: "Chuyển khoản (không xuất HĐ)",
  TRANSFER_INVOICE: "Chuyển khoản (cần xuất HĐ)",
  TRANSFER: "Chuyển khoản",
};

export type ReportBill = {
  billNo: string;
  paidAt: string;
  date: string; // YYYY-MM-DD, Vietnam time
  table: string;
  cashier: string;
  guestCount: number | null;
  itemCount: number;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  method: MethodKey;
  account: string;
  /** Billed before bills were stored (10/2026): discount unknown, VAT recomputed from today's rates. */
  legacy: boolean;
};

export type ReportOnline = {
  code: string;
  paidAt: string;
  date: string;
  channel: string;
  customer: string;
  paidBy: string;
  total: number;
  method: MethodKey;
};

export type BillReport = {
  from: string;
  to: string;
  bills: ReportBill[];
  online: ReportOnline[];
  summary: {
    billCount: number;
    guests: number;
    subtotal: number;
    discount: number;
    vat: number;
    billsTotal: number;
    byMethod: Record<MethodKey, number>;
    onlineCount: number;
    onlineTotal: number;
    grandTotal: number;
  };
  byDay: { date: string; billCount: number; billsTotal: number; cash: number; transfer: number; onlineTotal: number; total: number }[];
};

const VN_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const vnDate = (iso: string) => VN_DATE.format(new Date(iso));
const CHANNEL: Record<string, string> = { PICKUP: "Mang về", DELIVERY: "Giao tận nơi", LUMIA_ROOM: "Giao phòng Lumia" };

function methodKey(method: string | null, key: string | null): MethodKey {
  if (method !== "TRANSFER") return "CASH";
  if (key === "invoice") return "TRANSFER_INVOICE";
  if (key === "no_invoice") return "TRANSFER_NO_INVOICE";
  return "TRANSFER";
}

function dayList(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < 100) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export async function buildBillReport(from: string, to: string): Promise<BillReport> {
  const startMs = new Date(`${from}T00:00:00+07:00`).getTime();
  const endMs = new Date(`${to}T23:59:59.999+07:00`).getTime();
  const inRange = (iso: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= startMs && t <= endMs;
  };

  const [stored, orders, tableNames] = await Promise.all([listBills(), listOrders(undefined, 1_000_000), listTableNames()]);
  const nameOf = new Map(tableNames.map((t) => [t.tableId, t.displayName]));
  const storedNos = new Set(stored.map((b) => b.billNo));

  const bills: ReportBill[] = stored
    .filter((b) => inRange(b.paidAt))
    .map((b) => ({
      billNo: b.billNo,
      paidAt: b.paidAt,
      date: vnDate(b.paidAt),
      table: b.tableLabel,
      cashier: b.cashier,
      guestCount: b.guestCount,
      itemCount: b.itemCount,
      subtotal: b.subtotal,
      discount: b.discount,
      vat: b.vat,
      total: b.total,
      method: methodKey(b.method, b.bankAccountKey),
      account: b.bankAccountLabel ?? "",
      legacy: false,
    }));

  // Bills printed before the Bills tab existed: rebuild them from the stamped orders.
  const legacy = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!o.billNo || o.online || storedNos.has(o.billNo) || o.status !== "CONFIRMED") continue;
    const list = legacy.get(o.billNo) ?? [];
    list.push(o);
    legacy.set(o.billNo, list);
  }
  if (legacy.size) {
    const vatByItem = await vatRateByMenuItemId();
    for (const [billNo, group] of legacy) {
      const paidAt = group.map((o) => o.paidAt ?? o.confirmedAt ?? o.createdAt).sort().pop()!;
      if (!inRange(paidAt)) continue;
      let subtotal = 0;
      let vat = 0;
      let itemCount = 0;
      for (const o of group) {
        for (const it of o.items) {
          subtotal += it.lineTotal;
          itemCount += it.qty;
          vat += (it.lineTotal * ((it.menuItemId ? vatByItem.get(it.menuItemId) : undefined) ?? 8)) / 100;
        }
      }
      vat = Math.round(vat);
      const first = group[0];
      bills.push({
        billNo,
        paidAt,
        date: vnDate(paidAt),
        table: nameOf.get(first.tableId) || first.tableId,
        cashier: first.paidBy ?? "",
        guestCount: null,
        itemCount: Math.round(itemCount * 100) / 100,
        subtotal,
        discount: 0,
        vat,
        total: subtotal + vat,
        method: methodKey(first.paymentMethod, first.bankAccountKey),
        account: first.bankAccountLabel ?? "",
        legacy: true,
      });
    }
  }
  bills.sort((a, b) => (a.paidAt < b.paidAt ? -1 : 1));

  const online: ReportOnline[] = orders
    .filter((o) => o.online && o.status === "CONFIRMED" && o.paidAt && inRange(o.paidAt))
    .map((o) => ({
      code: o.online!.code,
      paidAt: o.paidAt!,
      date: vnDate(o.paidAt!),
      channel: CHANNEL[o.online!.channel] ?? o.online!.channel,
      customer: o.online!.customerName,
      paidBy: o.paidBy ?? "",
      total: o.totalAmount,
      method: methodKey(o.paymentMethod, o.bankAccountKey),
    }))
    .sort((a, b) => (a.paidAt < b.paidAt ? -1 : 1));

  const byMethod: Record<MethodKey, number> = { CASH: 0, TRANSFER_NO_INVOICE: 0, TRANSFER_INVOICE: 0, TRANSFER: 0 };
  for (const b of bills) byMethod[b.method] += b.total;
  const billsTotal = bills.reduce((s, b) => s + b.total, 0);
  const onlineTotal = online.reduce((s, o) => s + o.total, 0);

  const byDay = dayList(from, to).map((date) => {
    const db = bills.filter((b) => b.date === date);
    const dOnline = online.filter((o) => o.date === date).reduce((s, o) => s + o.total, 0);
    const dTotal = db.reduce((s, b) => s + b.total, 0);
    const cash = db.filter((b) => b.method === "CASH").reduce((s, b) => s + b.total, 0);
    return { date, billCount: db.length, billsTotal: dTotal, cash, transfer: dTotal - cash, onlineTotal: dOnline, total: dTotal + dOnline };
  });

  return {
    from,
    to,
    bills,
    online,
    summary: {
      billCount: bills.length,
      guests: bills.reduce((s, b) => s + (b.guestCount ?? 0), 0),
      subtotal: bills.reduce((s, b) => s + b.subtotal, 0),
      discount: bills.reduce((s, b) => s + b.discount, 0),
      vat: bills.reduce((s, b) => s + b.vat, 0),
      billsTotal,
      byMethod,
      onlineCount: online.length,
      onlineTotal,
      grandTotal: billsTotal + onlineTotal,
    },
    byDay,
  };
}

const TIME = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
const dmy = (date: string) => date.split("-").reverse().join("/");

export function billReportXlsx(r: BillReport, generatedBy: string): Uint8Array {
  const s = r.summary;
  const period = r.from === r.to ? dmy(r.from) : `${dmy(r.from)} – ${dmy(r.to)}`;
  const summaryRows = [
    [{ v: "BÁO CÁO HOÁ ĐƠN — LOUIS WINE ĐÀ NẴNG", bold: true }],
    [`Kỳ báo cáo: ${period}`],
    [`Xuất bởi: ${generatedBy} · ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`],
    [],
    [{ v: "Hoá đơn tại nhà hàng", bold: true }],
    ["Số hoá đơn", s.billCount],
    ["Số khách", s.guests],
    ["Tiền món", s.subtotal],
    ["Chiết khấu", s.discount],
    ["Thuế VAT", s.vat],
    [{ v: "Tổng thu hoá đơn", bold: true }, { v: s.billsTotal, bold: true, money: true }],
    [],
    [{ v: "Theo hình thức thanh toán", bold: true }],
    ...(Object.keys(METHOD_LABEL) as MethodKey[]).filter((k) => k !== "TRANSFER" || s.byMethod.TRANSFER > 0).map((k) => [METHOD_LABEL[k], s.byMethod[k]]),
    [],
    [{ v: "Đơn online đã thu", bold: true }],
    ["Số đơn", s.onlineCount],
    ["Tổng thu online", s.onlineTotal],
    [],
    [{ v: "TỔNG THU (hoá đơn + online)", bold: true }, { v: s.grandTotal, bold: true, money: true }],
  ];
  const dayRows = [
    ["Ngày", "Số HĐ", "Thu hoá đơn", "Tiền mặt", "Chuyển khoản", "Thu online", "Tổng thu"],
    ...r.byDay.map((d) => [dmy(d.date), d.billCount, d.billsTotal, d.cash, d.transfer, d.onlineTotal, d.total]),
    ["Cộng", s.billCount, s.billsTotal, s.byMethod.CASH, s.billsTotal - s.byMethod.CASH, s.onlineTotal, s.grandTotal],
  ];
  const billRows = [
    ["Ngày", "Giờ", "Số HĐ", "Bàn", "Thu ngân", "Số khách", "Số món", "Tiền món", "Chiết khấu", "VAT", "Tổng thu", "Hình thức", "Tài khoản", "Ghi chú"],
    ...r.bills.map((b) => [
      dmy(b.date),
      TIME.format(new Date(b.paidAt)),
      b.billNo,
      b.table,
      b.cashier,
      b.guestCount,
      b.itemCount,
      b.subtotal,
      b.discount,
      b.vat,
      b.total,
      METHOD_LABEL[b.method],
      b.account,
      b.legacy ? "HĐ cũ: chưa lưu chiết khấu, VAT tính lại" : "",
    ]),
    ["Cộng", "", `${r.bills.length} HĐ`, "", "", s.guests, "", s.subtotal, s.discount, s.vat, s.billsTotal],
  ];
  const onlineRows = [
    ["Ngày", "Giờ", "Mã đơn", "Hình thức nhận", "Khách", "Người thu", "Tổng thu", "Thanh toán"],
    ...r.online.map((o) => [dmy(o.date), TIME.format(new Date(o.paidAt)), o.code, o.channel, o.customer, o.paidBy, o.total, METHOD_LABEL[o.method]]),
    ["Cộng", "", `${r.online.length} đơn`, "", "", "", s.onlineTotal],
  ];
  return buildXlsx([
    { name: "Tổng hợp", rows: summaryRows, widths: [34, 18], moneyCols: [1] },
    { name: "Theo ngày", rows: dayRows, widths: [12, 8, 16, 16, 16, 16, 16], moneyCols: [2, 3, 4, 5, 6], boldRows: [0, dayRows.length - 1] },
    { name: "Hoá đơn", rows: billRows, widths: [11, 7, 12, 8, 12, 9, 8, 14, 12, 12, 14, 26, 30, 34], moneyCols: [7, 8, 9, 10], boldRows: [0, billRows.length - 1] },
    { name: "Đơn online", rows: onlineRows, widths: [11, 7, 12, 16, 22, 12, 14, 26], moneyCols: [6], boldRows: [0, onlineRows.length - 1] },
  ]);
}
