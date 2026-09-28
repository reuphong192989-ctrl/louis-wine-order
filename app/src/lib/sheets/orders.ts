import { randomUUID } from "crypto";
import { appendRow, appendRows, deleteRows, readAllRows, readAllRowsCached, readTabsCached, updateRow, cell } from "./core";

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
  "confirmedBy",
  "cancelledBy",
  // Website channels (pickup / delivery / Lumia room). Empty on table orders.
  "channel",
  "code",
  "customerName",
  "phone",
  "address",
  "hotelRoom",
  "roomVerified",
  "scheduledTime",
  "subtotal",
  "discount",
  "shippingFee",
];

/** TABLE = QR at a restaurant table; the rest come from the public website. */
export type OrderChannel = "TABLE" | "PICKUP" | "DELIVERY" | "LUMIA_ROOM";

export type OnlineOrderInfo = {
  channel: Exclude<OrderChannel, "TABLE">;
  code: string;
  customerName: string;
  phone: string;
  address: string | null;
  hotelRoom: string | null;
  roomVerified: boolean;
  scheduledTime: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
};

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
  confirmedBy: string | null;
  cancelledBy: string | null;
  /** Present only for website orders (pickup / delivery / Lumia room). */
  online: OnlineOrderInfo | null;
  items: OrderItemLine[];
};

function decodeOnline(values: Record<string, string>): OnlineOrderInfo | null {
  const channel = values.channel as OrderChannel | undefined;
  if (!channel || channel === "TABLE") return null;
  return {
    channel,
    code: values.code ?? "",
    customerName: values.customerName ?? "",
    phone: values.phone ?? "",
    address: cell.strOrNull(values.address ?? ""),
    hotelRoom: cell.strOrNull(values.hotelRoom ?? ""),
    roomVerified: cell.toBool(values.roomVerified ?? ""),
    scheduledTime: cell.strOrNull(values.scheduledTime ?? ""),
    subtotal: cell.toInt(values.subtotal ?? ""),
    discount: cell.toInt(values.discount ?? ""),
    shippingFee: cell.toInt(values.shippingFee ?? ""),
  };
}

function encodeOnline(online: OnlineOrderInfo | null): Record<string, string> {
  if (!online) return { channel: "TABLE" };
  return {
    channel: online.channel,
    code: online.code,
    customerName: online.customerName,
    phone: online.phone,
    address: cell.str(online.address),
    hotelRoom: cell.str(online.hotelRoom),
    roomVerified: cell.bool(online.roomVerified),
    scheduledTime: cell.str(online.scheduledTime),
    subtotal: cell.int(online.subtotal),
    discount: cell.int(online.discount),
    shippingFee: cell.int(online.shippingFee),
  };
}

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
    confirmedBy: cell.strOrNull(values.confirmedBy),
    cancelledBy: cell.strOrNull(values.cancelledBy),
    online: decodeOnline(values),
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

// Staff/kitchen screens poll every 4s and a waiting customer every 3s; share one
// read (both tabs in a single batchGet) across all of them for 2s.
const LIST_TTL_MS = 2_000;

/** Lists orders (most recent first), each with its line items attached. */
export async function listOrders(status?: OrderStatus, limit = 200): Promise<Order[]> {
  const [orderRows, itemRows] = await readTabsCached([ORDERS_TAB, ORDER_ITEMS_TAB], LIST_TTL_MS);

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
  const rows = await readAllRowsCached(ORDERS_TAB, LIST_TTL_MS);
  return rows.map((r) => decodeOrder(r.values));
}

export async function findOrderById(id: string): Promise<Order | null> {
  const all = await listOrders(undefined, 100000);
  return all.find((o) => o.id === id) ?? null;
}

/** Website order lookup by its short public code (e.g. LWK3F9A2). */
export async function findOrderByCode(code: string): Promise<Order | null> {
  const all = await listOrders(undefined, 100000);
  return all.find((o) => o.online?.code === code) ?? null;
}

export async function createOrder(input: {
  tableId: string;
  lines: { menuItemId: string; nameSnapshot: string; unitPrice: number; qty: number; lineTotal: number; note: string | null }[];
  /** Website orders: customer/delivery details and the final total after discount + shipping. */
  online?: OnlineOrderInfo;
  note?: string | null;
}): Promise<Order> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const online = input.online ?? null;
  const itemsTotal = input.lines.reduce((s, l) => s + l.lineTotal, 0);
  const totalAmount = online ? online.subtotal - online.discount + online.shippingFee : itemsTotal;

  await appendRow(ORDERS_TAB, ORDERS_HEADERS, {
    id,
    tableId: input.tableId,
    status: "PENDING",
    totalAmount: cell.int(totalAmount),
    note: cell.str(input.note),
    createdAt,
    confirmedAt: "",
    cancelledAt: "",
    itemsSummary: buildItemsSummary(input.lines),
    confirmedBy: "",
    cancelledBy: "",
    ...encodeOnline(online),
  });

  const items: OrderItemLine[] = input.lines.map((line) => ({
    id: randomUUID(),
    orderId: id,
    ...line,
    kitchenStatus: "PENDING",
  }));
  // One append for all lines (was one request per line) — fewer writes against
  // the per-minute quota and no half-written orders if a later request fails.
  await appendRows(
    ORDER_ITEMS_TAB,
    ORDER_ITEMS_HEADERS,
    items.map((item) => ({
      id: item.id,
      orderId: id,
      menuItemId: cell.str(item.menuItemId),
      nameSnapshot: item.nameSnapshot,
      unitPrice: cell.int(item.unitPrice),
      qty: cell.int(item.qty),
      lineTotal: cell.int(item.lineTotal),
      kitchenStatus: "PENDING",
      note: cell.str(item.note),
    }))
  );

  return {
    id,
    tableId: input.tableId,
    status: "PENDING",
    totalAmount,
    note: input.note ?? null,
    createdAt,
    confirmedAt: null,
    cancelledAt: null,
    confirmedBy: null,
    cancelledBy: null,
    online,
    items,
  };
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

/** Permanently deletes one order and all of its line items. Irreversible — owner-only. */
export async function deleteOrder(id: string): Promise<boolean> {
  const [orderRows, itemRows] = await Promise.all([readAllRows(ORDERS_TAB), readAllRows(ORDER_ITEMS_TAB)]);
  const orderRow = orderRows.find((r) => r.values.id === id);
  if (!orderRow) return false;

  const itemRowNumbers = itemRows.filter((r) => r.values.orderId === id).map((r) => r.rowNumber);
  await Promise.all([deleteRows(ORDERS_TAB, [orderRow.rowNumber]), deleteRows(ORDER_ITEMS_TAB, itemRowNumbers)]);
  return true;
}

/** Permanently deletes every order created within [fromIso, toIso] (inclusive) and their line items. Irreversible — owner-only. Returns the number of orders deleted. */
export async function deleteOrdersInRange(fromIso: string, toIso: string): Promise<number> {
  const [orderRows, itemRows] = await Promise.all([readAllRows(ORDERS_TAB), readAllRows(ORDER_ITEMS_TAB)]);
  const toDelete = orderRows.filter((r) => r.values.createdAt >= fromIso && r.values.createdAt <= toIso);
  if (toDelete.length === 0) return 0;

  const idsToDelete = new Set(toDelete.map((r) => r.values.id));
  const itemRowNumbers = itemRows.filter((r) => idsToDelete.has(r.values.orderId)).map((r) => r.rowNumber);

  await Promise.all([
    deleteRows(ORDERS_TAB, toDelete.map((r) => r.rowNumber)),
    deleteRows(ORDER_ITEMS_TAB, itemRowNumbers),
  ]);
  return toDelete.length;
}

/** handledBy is the username of the staff member confirming/cancelling — recorded for the monthly staff KPI review. */
export async function setOrderStatus(id: string, status: "CONFIRMED" | "CANCELLED", handledBy: string): Promise<Order | null> {
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
    confirmedBy: status === "CONFIRMED" ? handledBy : current.confirmedBy,
    cancelledBy: status === "CANCELLED" ? handledBy : current.cancelledBy,
  };

  await updateRow(ORDERS_TAB, row.rowNumber, ORDERS_HEADERS, {
    ...row.values,
    id: next.id,
    tableId: next.tableId,
    status: next.status,
    totalAmount: cell.int(next.totalAmount),
    note: cell.str(next.note),
    createdAt: next.createdAt,
    confirmedAt: cell.str(next.confirmedAt),
    cancelledAt: cell.str(next.cancelledAt),
    itemsSummary: row.values.itemsSummary ?? "",
    confirmedBy: cell.str(next.confirmedBy),
    cancelledBy: cell.str(next.cancelledBy),
  });

  const itemRows = await readAllRows(ORDER_ITEMS_TAB);
  const items = itemRows.map((r) => decodeOrderItem(r.values)).filter((it) => it.orderId === id);
  return { ...next, items };
}

export { ORDERS_TAB, ORDERS_HEADERS, ORDER_ITEMS_TAB, ORDER_ITEMS_HEADERS };
