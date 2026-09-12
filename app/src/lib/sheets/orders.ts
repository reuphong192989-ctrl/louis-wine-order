import { randomUUID } from "crypto";
import { appendRow, readAllRows, updateRow, cell } from "./core";

const ORDERS_TAB = "Orders";
// itemsSummary is a read-only, human-friendly duplicate of the OrderItems rows
// (e.g. "Pate Louis x1, Lẩu baba rượu vang x1") so the Orders tab is readable
// on its own without cross-referencing OrderItems by orderId.
const ORDERS_HEADERS = [
  "id",
  "tableId",
  "status",
  "totalAmount",
  "note",
  "createdAt",
  "confirmedAt",
  "cancelledAt",
  "itemsSummary",
];

function buildItemsSummary(lines: { nameSnapshot: string; qty: number }[]): string {
  return lines.map((l) => `${l.nameSnapshot} x${l.qty}`).join(", ");
}

const ORDER_ITEMS_TAB = "OrderItems";
const ORDER_ITEMS_HEADERS = ["id", "orderId", "menuItemId", "nameSnapshot", "unitPrice", "qty", "lineTotal", "kitchenStatus", "note"];

export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type KitchenStatus = "PENDING" | "COOKING" | "DONE";

export type OrderItemLine = {
  id: string;
  orderId: string;
  menuItemId: string | null;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  kitchenStatus: KitchenStatus;
  note: string | null;
};

export type Order = {
  id: string;
  tableId: string;
  status: OrderStatus;
  totalAmount: number;
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  items: OrderItemLine[];
};

function decodeOrder(values: Record<string, string>): Omit<Order, "items"> {
  return {
    id: values.id,
    tableId: values.tableId,
    status: values.status as OrderStatus,
    totalAmount: cell.toInt(values.totalAmount),
    note: cell.strOrNull(values.note),
    createdAt: values.createdAt,
    confirmedAt: cell.strOrNull(values.confirmedAt),
    cancelledAt: cell.strOrNull(values.cancelledAt),
  };
}

function decodeOrderItem(values: Record<string, string>): OrderItemLine {
  return {
    id: values.id,
    orderId: values.orderId,
    menuItemId: cell.strOrNull(values.menuItemId),
    nameSnapshot: values.nameSnapshot,
    unitPrice: cell.toInt(values.unitPrice),
    qty: cell.toInt(values.qty),
    lineTotal: cell.toInt(values.lineTotal),
    kitchenStatus: (values.kitchenStatus || "PENDING") as KitchenStatus,
    note: cell.strOrNull(values.note ?? ""),
  };
}

/** Lists orders (most recent first), each with its line items attached. */
export async function listOrders(status?: OrderStatus, limit = 200): Promise<Order[]> {
  const [orderRows, itemRows] = await Promise.all([readAllRows(ORDERS_TAB), readAllRows(ORDER_ITEMS_TAB)]);

  const itemsByOrder = new Map<string, OrderItemLine[]>();
  for (const row of itemRows) {
    const item = decodeOrderItem(row.values);
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  let orders = orderRows
    .map((r) => decodeOrder(r.values))
    .map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));

  if (status) orders = orders.filter((o) => o.status === status);

  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return orders.slice(0, limit);
}

/** Orders without their line items — cheaper than listOrders() for reports/aggregation that only need status/amount/dates. */
export async function listAllOrdersRaw(): Promise<Omit<Order, "items">[]> {
  const rows = await readAllRows(ORDERS_TAB);
  return rows.map((r) => decodeOrder(r.values));
}

export async function findOrderById(id: string): Promise<Order | null> {
  const all = await listOrders(undefined, 100000);
  return all.find((o) => o.id === id) ?? null;
}

export async function createOrder(input: {
  tableId: string;
  lines: { menuItemId: string; nameSnapshot: string; unitPrice: number; qty: number; lineTotal: number; note: string | null }[];
}): Promise<Order> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const totalAmount = input.lines.reduce((s, l) => s + l.lineTotal, 0);

  await appendRow(ORDERS_TAB, ORDERS_HEADERS, {
    id,
    tableId: input.tableId,
    status: "PENDING",
    totalAmount: cell.int(totalAmount),
    note: "",
    createdAt,
    confirmedAt: "",
    cancelledAt: "",
    itemsSummary: buildItemsSummary(input.lines),
  });

  const items: OrderItemLine[] = [];
  for (const line of input.lines) {
    const itemId = randomUUID();
    const item: OrderItemLine = { id: itemId, orderId: id, ...line, kitchenStatus: "PENDING" };
    items.push(item);
    await appendRow(ORDER_ITEMS_TAB, ORDER_ITEMS_HEADERS, {
      id: itemId,
      orderId: id,
      menuItemId: line.menuItemId,
      nameSnapshot: line.nameSnapshot,
      unitPrice: cell.int(line.unitPrice),
      qty: cell.int(line.qty),
      lineTotal: cell.int(line.lineTotal),
      kitchenStatus: "PENDING",
      note: cell.str(line.note),
    });
  }

  return { id, tableId: input.tableId, status: "PENDING", totalAmount, note: null, createdAt, confirmedAt: null, cancelledAt: null, items };
}

/** Kitchen marks a single line item as cooking/done (or reverts it). Returns the parent order with all items, or null if the item doesn't exist. */
export async function setOrderItemStatus(itemId: string, kitchenStatus: KitchenStatus): Promise<Order | null> {
  const itemRows = await readAllRows(ORDER_ITEMS_TAB);
  const row = itemRows.find((r) => r.values.id === itemId);
  if (!row) return null;

  await updateRow(ORDER_ITEMS_TAB, row.rowNumber, ORDER_ITEMS_HEADERS, {
    ...row.values,
    kitchenStatus,
  });

  const orderId = row.values.orderId;
  const orderRows = await readAllRows(ORDERS_TAB);
  const orderRow = orderRows.find((r) => r.values.id === orderId);
  if (!orderRow) return null;

  const items = itemRows
    .map((r) => (r.rowNumber === row.rowNumber ? decodeOrderItem({ ...row.values, kitchenStatus }) : decodeOrderItem(r.values)))
    .filter((it) => it.orderId === orderId);

  return { ...decodeOrder(orderRow.values), items };
}

export async function setOrderStatus(id: string, status: "CONFIRMED" | "CANCELLED"): Promise<Order | null> {
  const rows = await readAllRows(ORDERS_TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;

  const now = new Date().toISOString();
  const current = decodeOrder(row.values);
  const next = {
    ...current,
    status,
    confirmedAt: status === "CONFIRMED" ? now : current.confirmedAt,
    cancelledAt: status === "CANCELLED" ? now : current.cancelledAt,
  };

  await updateRow(ORDERS_TAB, row.rowNumber, ORDERS_HEADERS, {
    id: next.id,
    tableId: next.tableId,
    status: next.status,
    totalAmount: cell.int(next.totalAmount),
    note: cell.str(next.note),
    createdAt: next.createdAt,
    confirmedAt: cell.str(next.confirmedAt),
    cancelledAt: cell.str(next.cancelledAt),
    itemsSummary: row.values.itemsSummary ?? "",
  });

  const itemRows = await readAllRows(ORDER_ITEMS_TAB);
  const items = itemRows.map((r) => decodeOrderItem(r.values)).filter((it) => it.orderId === id);
  return { ...next, items };
}
