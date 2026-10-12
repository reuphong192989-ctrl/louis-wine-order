import { listOrders, applyOrderWorkflow, type Order, type BankAccountKey } from "./sheets/orders";
import { listAllMenuItems } from "./sheets/menuItems";
import { listCategories } from "./sheets/categories";
import { listTableNames } from "./sheets/tableNames";
import { genCode } from "./site/validate";
import { appendBill } from "./sheets/bills";
import { computeBill, type BillGroup, type DiscountInput, type VatGroup } from "./bill-math";

export type { BillGroup, VatGroup };

import { defaultTableLabel } from "@/lib/table-id";
const FALLBACK_VAT_RATE = 8; // item's menu/category was deleted since the order was placed

export type BillLine = {
  itemId: string;
  /** Which order ("lượt gọi") the line came from, and when — lets staff take back a whole round. */
  orderId: string;
  orderCreatedAt: string;
  kitchenStatus: "PENDING" | "COOKING" | "DONE";
  /** Unused units of this line may be handed back ("Trả lại") instead of cancelled. */
  returnable: boolean;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  vatRate: number;
  /** Section of the printed bill: Đồ ăn / Đồ uống / Khác (from the item's category). */
  group: BillGroup;
};

export type TableBillPreview = {
  tableId: string;
  tableLabel: string;
  orderIds: string[];
  checkInAt: string | null;
  items: BillLine[];
  subtotal: number;
  vatGroups: VatGroup[];
  totalVat: number;
};

export type FinalizedBill = TableBillPreview & {
  billNo: string;
  guestCount: number | null;
  discountAmount: number;
  /** Set only when the cashier entered the discount as a percentage. */
  discountPercent: number | null;
  customerName: string | null;
  totalAmount: number;
  paymentMethod: "CASH" | "TRANSFER";
  bankAccountKey: BankAccountKey | null;
  bankAccountLabel: string | null;
  printedBy: string;
  printedAt: string;
};

/** Menu item ids whose category lets guests hand back unused units (beer, wine, cigars, towels…). */
async function returnableMenuItemIds(): Promise<Set<string>> {
  const [items, categories] = await Promise.all([listAllMenuItems(), listCategories()]);
  const returnableCats = new Set(categories.filter((c) => c.returnable).map((c) => c.id));
  return new Set(items.filter((it) => returnableCats.has(it.categoryId)).map((it) => it.id));
}

export async function vatRateByMenuItemId(): Promise<Map<string, number>> {
  const [items, categories] = await Promise.all([listAllMenuItems(), listCategories()]);
  const catVat = new Map(categories.map((c) => [c.id, c.vatRate]));
  const map = new Map<string, number>();
  for (const it of items) map.set(it.id, catVat.get(it.categoryId) ?? FALLBACK_VAT_RATE);
  return map;
}

/** Bill section (Đồ ăn / Đồ uống / Khác) of every menu item, taken from its category. */
export async function billGroupByMenuItemId(): Promise<Map<string, BillGroup>> {
  const [items, categories] = await Promise.all([listAllMenuItems(), listCategories()]);
  const catGroup = new Map(categories.map((c) => [c.id, c.group]));
  const map = new Map<string, BillGroup>();
  for (const it of items) map.set(it.id, catGroup.get(it.categoryId) ?? "FOOD");
  return map;
}

/** Confirmed, dine-in (not website), not-yet-billed orders for one table — what a cashier print would combine. */
async function openOrdersForTable(tableId: string): Promise<Order[]> {
  const orders = await listOrders("CONFIRMED", 100000);
  return orders.filter((o) => o.tableId === tableId && !o.online && !o.billNo);
}

function buildPreview(
  tableId: string,
  tableLabel: string,
  orders: Order[],
  vatByItem: Map<string, number>,
  returnable: Set<string>,
  groupByItem: Map<string, BillGroup>,
): TableBillPreview {
  const items: BillLine[] = [];
  for (const o of orders) {
    for (const it of o.items) {
      const vatRate = (it.menuItemId ? vatByItem.get(it.menuItemId) : undefined) ?? FALLBACK_VAT_RATE;
      const group = (it.menuItemId ? groupByItem.get(it.menuItemId) : undefined) ?? "FOOD"; // item deleted since the order: treat as food
      items.push({ itemId: it.id, orderId: o.id, orderCreatedAt: o.createdAt, kitchenStatus: it.kitchenStatus, returnable: !!it.menuItemId && returnable.has(it.menuItemId), name: it.nameSnapshot, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.lineTotal, vatRate, group });
    }
  }
  // Pre-discount figures; the cashier screen and finalize re-run computeBill() with the discount.
  const { subtotal, vatGroups, totalVat } = computeBill(items, null);

  const checkInAt = orders.length
    ? orders.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), orders[0].createdAt)
    : null;

  return { tableId, tableLabel, orderIds: orders.map((o) => o.id), checkInAt, items, subtotal, vatGroups, totalVat };
}

/** Cashier worklist: every table that currently has confirmed, unbilled orders waiting to be checked out. */
export async function listOpenTableBills(): Promise<
  {
    tableId: string;
    tableLabel: string;
    orderCount: number;
    itemCount: number;
    total: number;
    oldestCreatedAt: string;
    /** Staff who confirmed or took any of this table's orders — lets a waiter filter to "my tables". */
    staff: string[];
  }[]
> {
  const [orders, tableNames] = await Promise.all([listOrders("CONFIRMED", 100000), listTableNames()]);
  const nameMap = new Map(tableNames.map((t) => [t.tableId, t.displayName]));

  const byTable = new Map<string, Order[]>();
  for (const o of orders) {
    if (o.online || o.billNo) continue;
    const list = byTable.get(o.tableId) ?? [];
    list.push(o);
    byTable.set(o.tableId, list);
  }

  return [...byTable.entries()]
    .map(([tableId, list]) => ({
      tableId,
      tableLabel: nameMap.get(tableId) || defaultTableLabel(tableId),
      orderCount: list.length,
      itemCount: list.reduce((s, o) => s + o.items.length, 0),
      total: list.reduce((s, o) => s + o.totalAmount, 0),
      oldestCreatedAt: list.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), list[0].createdAt),
      staff: [...new Set(list.flatMap((o) => [o.confirmedBy, o.claimedBy]).filter((u): u is string => !!u))],
    }))
    .sort((a, b) => (a.oldestCreatedAt < b.oldestCreatedAt ? -1 : 1));
}

/** Combined preview for one table — read-only, doesn't touch the orders. */
export async function previewTableBill(tableId: string): Promise<TableBillPreview | null> {
  const [orders, tableNames, vatByItem, returnable, groupByItem] = await Promise.all([
    openOrdersForTable(tableId),
    listTableNames(),
    vatRateByMenuItemId(),
    returnableMenuItemIds(),
    billGroupByMenuItemId(),
  ]);
  if (orders.length === 0) return null;
  const tableLabel = tableNames.find((t) => t.tableId === tableId)?.displayName || defaultTableLabel(tableId);
  return buildPreview(tableId, tableLabel, orders, vatByItem, returnable, groupByItem);
}

/** Commits: stamps every open order for the table with one shared bill number so they print as a single bill. */
export async function finalizeTableBill(
  tableId: string,
  input: {
    guestCount: number | null;
    /** Entered as a percentage or a fixed amount; the amount is always recomputed here from the real bill. */
    discount: DiscountInput;
    customerName: string | null;
    method: "CASH" | "TRANSFER";
    bankAccountKey: BankAccountKey | null;
    bankAccountLabel: string | null;
    printedBy: string;
  },
): Promise<{ bill: FinalizedBill } | { error: string }> {
  const preview = await previewTableBill(tableId);
  if (!preview) return { error: "Bàn này không có đơn nào đã xác nhận mà chưa thanh toán." };

  const billNo = genCode("HD");
  for (const orderId of preview.orderIds) {
    const result = await applyOrderWorkflow(
      orderId,
      { type: "bill", method: input.method, bankAccountKey: input.bankAccountKey, bankAccountLabel: input.bankAccountLabel, billNo },
      input.printedBy,
    );
    if ("error" in result) return { error: result.error };
  }

  // Discount comes off the price before VAT, so VAT is charged on what the guest actually pays for.
  const totals = computeBill(preview.items, input.discount);
  const totalAmount = totals.total;
  const printedAt = new Date().toISOString();

  // Keep the printed figures (discount, VAT, total) for the daily/weekly bill report.
  await appendBill({
    billNo,
    tableId: preview.tableId,
    tableLabel: preview.tableLabel,
    checkInAt: preview.checkInAt,
    paidAt: printedAt,
    cashier: input.printedBy,
    guestCount: input.guestCount,
    itemCount: Math.round(preview.items.reduce((n, l) => n + l.qty, 0) * 100) / 100,
    subtotal: totals.subtotal,
    discount: totals.discountAmount,
    discountPercent: totals.discountPercent,
    customerName: input.customerName,
    vat: totals.totalVat,
    total: totalAmount,
    method: input.method,
    bankAccountKey: input.bankAccountKey,
    bankAccountLabel: input.bankAccountLabel,
    orderIds: preview.orderIds,
  }).catch((e) => console.error("appendBill failed", e));

  return {
    bill: {
      ...preview,
      vatGroups: totals.vatGroups,
      totalVat: totals.totalVat,
      billNo,
      guestCount: input.guestCount,
      discountAmount: totals.discountAmount,
      discountPercent: totals.discountPercent,
      customerName: input.customerName,
      totalAmount,
      paymentMethod: input.method,
      bankAccountKey: input.bankAccountKey,
      bankAccountLabel: input.bankAccountLabel,
      printedBy: input.printedBy,
      printedAt,
    },
  };
}
