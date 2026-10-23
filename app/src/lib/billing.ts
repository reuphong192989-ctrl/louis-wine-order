import { listOrders, applyOrderWorkflow, type Order, type BankAccountKey } from "./sheets/orders";
import { listAllMenuItems } from "./sheets/menuItems";
import { listCategories } from "./sheets/categories";
import { listTableNames } from "./sheets/tableNames";
import { genCode } from "./site/validate";
import { appendBill } from "./sheets/bills";
import { applyComp, computeBill, type BillGroup, type DiscountInput, type VatGroup } from "./bill-math";

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
  /** Section of the printed bill: Đồ ăn / Đồ uống / Khác (the dish's own setting, else its category's). */
  group: BillGroup;
  /** Unit printed on the bill (Chai, Lon, Kg…); null = "phần". */
  unit: string | null;
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
  /** Dishes a manager marked "Mời" (served but not charged) — total waived, plus which printed rows (see billLineCompKey). */
  compAmount: number;
  compedKeys: string[];
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

export type ItemBillMeta = { vatRate: number; group: BillGroup; unit: string | null };

/** VAT %, bill section and unit of every menu item: the dish's own value if set, otherwise its category's. */
export async function billMetaByMenuItemId(): Promise<Map<string, ItemBillMeta>> {
  const [items, categories] = await Promise.all([listAllMenuItems(), listCategories()]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const map = new Map<string, ItemBillMeta>();
  for (const it of items) {
    const cat = catById.get(it.categoryId);
    map.set(it.id, {
      vatRate: it.vatRate ?? cat?.vatRate ?? FALLBACK_VAT_RATE,
      group: it.group ?? cat?.group ?? "FOOD",
      unit: it.unit,
    });
  }
  return map;
}

export async function vatRateByMenuItemId(): Promise<Map<string, number>> {
  const meta = await billMetaByMenuItemId();
  return new Map([...meta].map(([id, m]) => [id, m.vatRate]));
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
  metaByItem: Map<string, ItemBillMeta>,
  returnable: Set<string>,
): TableBillPreview {
  const items: BillLine[] = [];
  for (const o of orders) {
    for (const it of o.items) {
      const meta = it.menuItemId ? metaByItem.get(it.menuItemId) : undefined;
      // Dish deleted since the order was placed: 8% VAT, counted as food.
      const vatRate = meta?.vatRate ?? FALLBACK_VAT_RATE;
      const group = meta?.group ?? "FOOD";
      items.push({ itemId: it.id, orderId: o.id, orderCreatedAt: o.createdAt, kitchenStatus: it.kitchenStatus, returnable: !!it.menuItemId && returnable.has(it.menuItemId), name: it.nameSnapshot, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.lineTotal, vatRate, group, unit: meta?.unit ?? null });
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
  const [orders, tableNames, metaByItem, returnable] = await Promise.all([
    openOrdersForTable(tableId),
    listTableNames(),
    billMetaByMenuItemId(),
    returnableMenuItemIds(),
  ]);
  if (orders.length === 0) return null;
  const tableLabel = tableNames.find((t) => t.tableId === tableId)?.displayName || defaultTableLabel(tableId);
  return buildPreview(tableId, tableLabel, orders, metaByItem, returnable);
}

/** Commits: stamps every open order for the table with one shared bill number so they print as a single bill. */
export async function finalizeTableBill(
  tableId: string,
  input: {
    guestCount: number | null;
    /** Entered as a percentage or a fixed amount; the amount is always recomputed here from the real bill. */
    discount: DiscountInput;
    /** Printed rows (billLineCompKey) a manager marked "Mời" — validated server-side by the API route. */
    compedKeys: string[];
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

  // "Mời" dishes are zeroed out before VAT/discount so neither is charged on something given away for free;
  // bill.subtotal below stays the full pre-comp figure (what was actually served) for the printed "Tiền món" line.
  const compedKeys = new Set(input.compedKeys);
  const { lines: billableItems, compAmount } = applyComp(preview.items, compedKeys);
  const totals = computeBill(billableItems, input.discount);
  const totalAmount = totals.total;
  const printedAt = new Date().toISOString();

  const compedNames = [...new Set(preview.items.filter((l) => compedKeys.has(`${l.name}|${l.unitPrice}|${l.vatRate}`)).map((l) => l.name))];

  // Keep the printed figures (discount, comp, VAT, total) for the daily/weekly bill report.
  await appendBill({
    billNo,
    tableId: preview.tableId,
    tableLabel: preview.tableLabel,
    checkInAt: preview.checkInAt,
    paidAt: printedAt,
    cashier: input.printedBy,
    guestCount: input.guestCount,
    itemCount: Math.round(preview.items.reduce((n, l) => n + l.qty, 0) * 100) / 100,
    subtotal: preview.subtotal,
    discount: totals.discountAmount,
    discountPercent: totals.discountPercent,
    compAmount,
    compedItems: compedNames.join(", "),
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
      compAmount,
      compedKeys: [...compedKeys],
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
