import { listOrders, applyOrderWorkflow, type Order, type BankAccountKey } from "./sheets/orders";
import { listAllMenuItems } from "./sheets/menuItems";
import { listCategories } from "./sheets/categories";
import { listTableNames } from "./sheets/tableNames";
import { genCode } from "./site/validate";

const FALLBACK_VAT_RATE = 8; // item's menu/category was deleted since the order was placed

export type BillLine = { itemId: string; name: string; qty: number; unitPrice: number; lineTotal: number; vatRate: number };
export type VatGroup = { rate: number; base: number; amount: number };

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
  totalAmount: number;
  paymentMethod: "CASH" | "TRANSFER";
  bankAccountKey: BankAccountKey | null;
  bankAccountLabel: string | null;
  printedBy: string;
  printedAt: string;
};

async function vatRateByMenuItemId(): Promise<Map<string, number>> {
  const [items, categories] = await Promise.all([listAllMenuItems(), listCategories()]);
  const catVat = new Map(categories.map((c) => [c.id, c.vatRate]));
  const map = new Map<string, number>();
  for (const it of items) map.set(it.id, catVat.get(it.categoryId) ?? FALLBACK_VAT_RATE);
  return map;
}

/** Confirmed, dine-in (not website), not-yet-billed orders for one table — what a cashier print would combine. */
async function openOrdersForTable(tableId: string): Promise<Order[]> {
  const orders = await listOrders("CONFIRMED", 100000);
  return orders.filter((o) => o.tableId === tableId && !o.online && !o.billNo);
}

function buildPreview(tableId: string, tableLabel: string, orders: Order[], vatByItem: Map<string, number>): TableBillPreview {
  const items: BillLine[] = [];
  for (const o of orders) {
    for (const it of o.items) {
      const vatRate = (it.menuItemId ? vatByItem.get(it.menuItemId) : undefined) ?? FALLBACK_VAT_RATE;
      items.push({ itemId: it.id, name: it.nameSnapshot, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.lineTotal, vatRate });
    }
  }
  const subtotal = items.reduce((s, l) => s + l.lineTotal, 0);

  const bases = new Map<number, number>();
  for (const l of items) bases.set(l.vatRate, (bases.get(l.vatRate) ?? 0) + l.lineTotal);
  const vatGroups: VatGroup[] = [...bases.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, base]) => ({ rate, base, amount: Math.round((base * rate) / 100) }));
  const totalVat = vatGroups.reduce((s, g) => s + g.amount, 0);

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
      tableLabel: nameMap.get(tableId) || tableId,
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
  const [orders, tableNames, vatByItem] = await Promise.all([
    openOrdersForTable(tableId),
    listTableNames(),
    vatRateByMenuItemId(),
  ]);
  if (orders.length === 0) return null;
  const tableLabel = tableNames.find((t) => t.tableId === tableId)?.displayName || tableId;
  return buildPreview(tableId, tableLabel, orders, vatByItem);
}

/** Commits: stamps every open order for the table with one shared bill number so they print as a single bill. */
export async function finalizeTableBill(
  tableId: string,
  input: {
    guestCount: number | null;
    discountAmount: number;
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

  const totalAmount = Math.max(0, preview.subtotal - input.discountAmount + preview.totalVat);
  return {
    bill: {
      ...preview,
      billNo,
      guestCount: input.guestCount,
      discountAmount: input.discountAmount,
      totalAmount,
      paymentMethod: input.method,
      bankAccountKey: input.bankAccountKey,
      bankAccountLabel: input.bankAccountLabel,
      printedBy: input.printedBy,
      printedAt: new Date().toISOString(),
    },
  };
}
