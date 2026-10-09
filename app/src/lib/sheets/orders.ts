import { randomUUID } from "crypto";
import { appendRow, appendRows, batchUpdateRows, deleteRows, readAllRows, readAllRowsCached, readTabsCached, updateRow, cell } from "./core";
import { genCode } from "../site/validate";
import { logCancelledItems, type CostBearer } from "./cancelledItems";
import { listAllMenuItems } from "./menuItems";
import { listCategories } from "./categories";

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
  // Staff workflow: who took the pending order, then (website orders) handover + payment.
  "claimedBy",
  "claimedAt",
  "fulfillment",
  "fulfilledAt",
  "fulfilledBy",
  "paymentMethod",
  "paidAt",
  "paidBy",
  // Cashier screen (/thu-ngan): printable bill record, set once payment is finalized there.
  "billNo",
  "bankAccountKey",
  "bankAccountLabel",
  // Required when status becomes CANCELLED — shown to managers in the cancellation report.
  "cancelReason",
];

/** Website orders after the kitchen: out for delivery, then handed to the guest. */
export type Fulfillment = "" | "DELIVERING" | "DELIVERED";
export type PaymentMethod = "CASH" | "TRANSFER";
/** Which of the 2 cashier-configured accounts a transfer went to — "invoice" = needs a VAT bill raised separately (accounting follow-up). */
export type BankAccountKey = "no_invoice" | "invoice";

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
  claimedBy: string | null;
  claimedAt: string | null;
  fulfillment: Fulfillment;
  fulfilledAt: string | null;
  fulfilledBy: string | null;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  paidBy: string | null;
  billNo: string | null;
  bankAccountKey: BankAccountKey | null;
  bankAccountLabel: string | null;
  cancelReason: string | null;
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
    claimedBy: cell.strOrNull(values.claimedBy ?? ""),
    claimedAt: cell.strOrNull(values.claimedAt ?? ""),
    fulfillment: (values.fulfillment ?? "") as Fulfillment,
    fulfilledAt: cell.strOrNull(values.fulfilledAt ?? ""),
    fulfilledBy: cell.strOrNull(values.fulfilledBy ?? ""),
    paymentMethod: (cell.strOrNull(values.paymentMethod ?? "") as PaymentMethod | null),
    paidAt: cell.strOrNull(values.paidAt ?? ""),
    paidBy: cell.strOrNull(values.paidBy ?? ""),
    billNo: cell.strOrNull(values.billNo ?? ""),
    bankAccountKey: (cell.strOrNull(values.bankAccountKey ?? "") as BankAccountKey | null),
    bankAccountLabel: cell.strOrNull(values.bankAccountLabel ?? ""),
    cancelReason: cell.strOrNull(values.cancelReason ?? ""),
  };
}

function decodeOrderItem(values: Record<string, string>): OrderItemLine {
  return {
    id: values.id,
    orderId: values.orderId,
    menuItemId: cell.strOrNull(values.menuItemId),
    nameSnapshot: values.nameSnapshot,
    unitPrice: cell.toInt(values.unitPrice),
    // Not toInt: weighed items (e.g. fish by the kg) store a fractional qty like "1.2".
    qty: Number(values.qty) || 0,
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
    claimedBy: null,
    claimedAt: null,
    fulfillment: "",
    fulfilledAt: null,
    fulfilledBy: null,
    paymentMethod: null,
    paidAt: null,
    paidBy: null,
    billNo: null,
    bankAccountKey: null,
    bankAccountLabel: null,
    cancelReason: null,
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

/**
 * Staff corrects a line's quantity — mainly for items sold by weight, where the
 * guest orders "1" and the real weight (e.g. 1.2 kg) is only known after the
 * fish is weighed. Recomputes the line total and the order total. Dine-in
 * orders only (website orders carry discount/shipping math), and never after
 * the order has been billed or cancelled.
 */
export async function setOrderItemQty(itemId: string, qty: number): Promise<{ order: Order } | { error: string; status: number }> {
  const [itemRows, orderRows] = await Promise.all([readAllRows(ORDER_ITEMS_TAB), readAllRows(ORDERS_TAB)]);
  const itemRow = itemRows.find((r) => r.values.id === itemId);
  if (!itemRow) return { error: "Không tìm thấy món trong đơn.", status: 404 };
  const orderRow = orderRows.find((r) => r.values.id === itemRow.values.orderId);
  if (!orderRow) return { error: "Không tìm thấy đơn hàng.", status: 404 };

  const order = decodeOrder(orderRow.values);
  if (order.online) return { error: "Đơn online không sửa số lượng tại đây — vui lòng huỷ và đặt lại.", status: 400 };
  if (order.status === "CANCELLED") return { error: "Đơn đã huỷ.", status: 400 };
  if (order.billNo) return { error: "Bàn đã thanh toán, không sửa được nữa.", status: 400 };

  const unitPrice = cell.toInt(itemRow.values.unitPrice);
  const lineTotal = Math.round(unitPrice * qty);
  const updatedItem = { ...itemRow.values, qty: String(qty), lineTotal: cell.int(lineTotal) };
  await updateRow(ORDER_ITEMS_TAB, itemRow.rowNumber, ORDER_ITEMS_HEADERS, updatedItem);

  const items = itemRows
    .filter((r) => r.values.orderId === order.id)
    .map((r) => decodeOrderItem(r.rowNumber === itemRow.rowNumber ? updatedItem : r.values));
  const totalAmount = items.reduce((s, it) => s + it.lineTotal, 0);
  const orderValues = { ...orderRow.values, totalAmount: cell.int(totalAmount), itemsSummary: buildItemsSummary(items) };
  await updateRow(ORDERS_TAB, orderRow.rowNumber, ORDERS_HEADERS, orderValues);

  return { order: { ...decodeOrder(orderValues), items } };
}

/** A dish the kitchen has already started (cooking/done) has a real food cost — only a manager may take it back. */
export function canCancelStartedDish(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

const STARTED_DISH_ERROR = "Bếp đã bắt đầu làm món này — cần tài khoản quản lý để huỷ.";

/** Who absorbs dishes the kitchen had already started when they're cancelled anyway. */
export type CostAssignment = { costBearer: CostBearer; costBearerStaff: string | null } | null;

function costError(started: boolean, cost: CostAssignment): string | null {
  if (!started) return null;
  if (!cost) return "Món bếp đã làm — vui lòng chọn ai chịu chi phí (nhà hàng hay nhân viên).";
  if (cost.costBearer === "STAFF" && !cost.costBearerStaff) return "Vui lòng chọn nhân viên chịu chi phí.";
  return null;
}

function costFields(kitchenStatus: KitchenStatus, cost: CostAssignment) {
  if (kitchenStatus === "PENDING" || !cost) return { costBearer: null, costBearerStaff: null };
  return { costBearer: cost.costBearer, costBearerStaff: cost.costBearer === "STAFF" ? cost.costBearerStaff : null };
}

/**
 * Takes `qty` off one line of an open order: deletes the line when nothing is
 * left, otherwise lowers its qty; then recomputes the order total/summary.
 */
async function takeQtyOffLine(
  itemRows: SheetRowLike[],
  orderRow: SheetRowLike,
  itemRow: SheetRowLike,
  item: OrderItemLine,
  qty: number,
): Promise<{ orderValues: Record<string, string>; remaining: OrderItemLine[] }> {
  const siblings = itemRows.filter((r) => r.values.orderId === item.orderId);
  const remainingQty = Math.round((item.qty - qty) * 100) / 100;
  let remaining: OrderItemLine[];
  if (remainingQty <= 0) {
    await deleteRows(ORDER_ITEMS_TAB, [itemRow.rowNumber]);
    remaining = siblings.filter((r) => r.rowNumber !== itemRow.rowNumber).map((r) => decodeOrderItem(r.values));
  } else {
    const updatedItem = { ...itemRow.values, qty: String(remainingQty), lineTotal: cell.int(Math.round(item.unitPrice * remainingQty)) };
    await updateRow(ORDER_ITEMS_TAB, itemRow.rowNumber, ORDER_ITEMS_HEADERS, updatedItem);
    remaining = siblings.map((r) => decodeOrderItem(r.rowNumber === itemRow.rowNumber ? updatedItem : r.values));
  }
  const orderValues = {
    ...orderRow.values,
    totalAmount: cell.int(remaining.reduce((s, it) => s + it.lineTotal, 0)),
    itemsSummary: buildItemsSummary(remaining),
  };
  await updateRow(ORDERS_TAB, orderRow.rowNumber, ORDERS_HEADERS, orderValues);
  return { orderValues, remaining };
}

type SheetRowLike = { rowNumber: number; values: Record<string, string> };

/**
 * Cancels a whole order. Before confirmation it's the plain "Huỷ" on a pending
 * card. After confirmation (guest changed their mind once it reached the
 * kitchen) it additionally: refuses a billed order, needs a manager — and a
 * decision on who bears the cost — if any dish is already cooking/done, and
 * logs every dish to CancelledItems so the kitchen screen flashes the
 * cancellation and the manager report shows it.
 */
export async function cancelOrder(
  id: string,
  reason: string,
  by: { username: string; role: string },
  cost: CostAssignment = null,
): Promise<{ order: Order } | { error: string; status: number }> {
  const order = await findOrderById(id);
  if (!order) return { error: "Không tìm thấy đơn hàng.", status: 404 };
  if (order.status === "CANCELLED") return { error: "Đơn này đã được huỷ trước đó.", status: 400 };
  if (order.billNo) return { error: "Bàn đã thanh toán — không huỷ được nữa, liên hệ quản lý.", status: 400 };

  const wasConfirmed = order.status === "CONFIRMED";
  const started = wasConfirmed && order.items.some((it) => it.kitchenStatus !== "PENDING");
  if (started && !canCancelStartedDish(by.role)) {
    return { error: "Bếp đã bắt đầu làm món trong đơn này — cần tài khoản quản lý để huỷ.", status: 403 };
  }
  const costErr = costError(started, cost);
  if (costErr) return { error: costErr, status: 400 };

  const updated = await setOrderStatus(id, "CANCELLED", by.username, reason);
  if (!updated) return { error: "Không tìm thấy đơn hàng.", status: 404 };

  if (wasConfirmed) {
    const now = updated.cancelledAt ?? new Date().toISOString();
    await logCancelledItems(
      order.items.map((it) => ({
        orderId: order.id,
        itemId: it.id,
        tableId: order.tableId,
        nameSnapshot: it.nameSnapshot,
        unitPrice: it.unitPrice,
        qty: it.qty,
        lineTotal: it.lineTotal,
        kitchenStatus: it.kitchenStatus,
        scope: "order" as const,
        cancelledAt: now,
        cancelledBy: by.username,
        cancelReason: reason,
        ...costFields(it.kitchenStatus, cost),
      })),
    );
  }
  return { order: updated };
}

/**
 * Guest takes back one dish (or part of its quantity) from an order staff have
 * already confirmed. The dish leaves the order — kitchen screen, running bill
 * and cashier stop showing it — and is logged to CancelledItems for the kitchen
 * alert and the manager report. Taking back the last dish cancels the order.
 */
export async function cancelOrderItem(
  itemId: string,
  cancelQty: number | null,
  reason: string,
  by: { username: string; role: string },
  cost: CostAssignment = null,
): Promise<{ order: Order } | { error: string; status: number }> {
  const [itemRows, orderRows] = await Promise.all([readAllRows(ORDER_ITEMS_TAB), readAllRows(ORDERS_TAB)]);
  const itemRow = itemRows.find((r) => r.values.id === itemId);
  if (!itemRow) return { error: "Không tìm thấy món trong đơn.", status: 404 };
  const orderRow = orderRows.find((r) => r.values.id === itemRow.values.orderId);
  if (!orderRow) return { error: "Không tìm thấy đơn hàng.", status: 404 };

  const order = decodeOrder(orderRow.values);
  const item = decodeOrderItem(itemRow.values);
  if (order.online) return { error: "Đơn online chỉ huỷ được cả đơn.", status: 400 };
  if (order.status === "CANCELLED") return { error: "Đơn này đã được huỷ trước đó.", status: 400 };
  if (order.status !== "CONFIRMED") return { error: "Đơn chưa xác nhận — dùng nút Huỷ trên thẻ đơn đang chờ.", status: 400 };
  if (order.billNo) return { error: "Bàn đã thanh toán — không huỷ được nữa, liên hệ quản lý.", status: 400 };
  const started = item.kitchenStatus !== "PENDING";
  if (started && !canCancelStartedDish(by.role)) return { error: STARTED_DISH_ERROR, status: 403 };
  const costErr = costError(started, cost);
  if (costErr) return { error: costErr, status: 400 };

  const qty = cancelQty == null ? item.qty : Math.round(cancelQty * 100) / 100;
  if (!(qty > 0) || qty > item.qty) return { error: "Số lượng huỷ không hợp lệ.", status: 400 };

  const siblings = itemRows.filter((r) => r.values.orderId === order.id);
  if (qty >= item.qty && siblings.length === 1) return cancelOrder(order.id, reason, by, cost);

  const { orderValues, remaining } = await takeQtyOffLine(itemRows, orderRow, itemRow, item, qty);

  await logCancelledItems([
    {
      orderId: order.id,
      itemId: item.id,
      tableId: order.tableId,
      nameSnapshot: item.nameSnapshot,
      unitPrice: item.unitPrice,
      qty,
      lineTotal: Math.round(item.unitPrice * qty),
      kitchenStatus: item.kitchenStatus,
      scope: "item",
      cancelledAt: new Date().toISOString(),
      cancelledBy: by.username,
      cancelReason: reason,
      ...costFields(item.kitchenStatus, cost),
    },
  ]);

  return { order: { ...decodeOrder(orderValues), items: remaining } };
}

/**
 * Guest hands back unused, untouched units before paying (a case of beer only
 * half drunk, an unopened bottle, cigars, cold towels). Only for categories a
 * manager marked returnable — never cooked food. Not a cancellation: no kitchen
 * alert, no waste cost; the units go back to stock and are logged (scope
 * "return") for the returns report so the bar/stock count can be reconciled.
 */
export async function returnOrderItem(
  itemId: string,
  returnQty: number,
  note: string | null,
  by: { username: string; role: string },
): Promise<{ order: Order } | { error: string; status: number }> {
  const [itemRows, orderRows, menuItems, categories] = await Promise.all([
    readAllRows(ORDER_ITEMS_TAB),
    readAllRows(ORDERS_TAB),
    listAllMenuItems(),
    listCategories(),
  ]);
  const itemRow = itemRows.find((r) => r.values.id === itemId);
  if (!itemRow) return { error: "Không tìm thấy món trong đơn.", status: 404 };
  const orderRow = orderRows.find((r) => r.values.id === itemRow.values.orderId);
  if (!orderRow) return { error: "Không tìm thấy đơn hàng.", status: 404 };

  const order = decodeOrder(orderRow.values);
  const item = decodeOrderItem(itemRow.values);
  if (order.online) return { error: "Đơn online không trả hàng tại đây.", status: 400 };
  if (order.status !== "CONFIRMED") return { error: "Chỉ trả lại được hàng của đơn đã xác nhận.", status: 400 };
  if (order.billNo) return { error: "Bàn đã thanh toán — không trả lại được nữa, liên hệ quản lý.", status: 400 };

  const categoryId = menuItems.find((m) => m.id === item.menuItemId)?.categoryId;
  const category = categories.find((c) => c.id === categoryId);
  if (!category?.returnable) {
    return { error: "Món này không thuộc danh mục được trả lại — nếu khách không dùng, dùng nút Huỷ.", status: 400 };
  }

  const qty = Math.round(returnQty * 100) / 100;
  if (!(qty > 0) || qty > item.qty) return { error: "Số lượng trả lại không hợp lệ.", status: 400 };

  const now = new Date().toISOString();
  const logEntry = {
    orderId: order.id,
    itemId: item.id,
    tableId: order.tableId,
    nameSnapshot: item.nameSnapshot,
    unitPrice: item.unitPrice,
    qty,
    lineTotal: Math.round(item.unitPrice * qty),
    kitchenStatus: item.kitchenStatus,
    scope: "return" as const,
    cancelledAt: now,
    cancelledBy: by.username,
    cancelReason: note || "Khách trả lại (chưa dùng)",
    costBearer: null,
    costBearerStaff: null,
  };

  const siblings = itemRows.filter((r) => r.values.orderId === order.id);
  if (qty >= item.qty && siblings.length === 1) {
    // Everything in this order went back unused: close it without a kitchen "cancel" alert.
    const updated = await setOrderStatus(order.id, "CANCELLED", by.username, `Khách trả lại toàn bộ (chưa dùng)${note ? `: ${note}` : ""}`);
    await logCancelledItems([logEntry]);
    if (!updated) return { error: "Không tìm thấy đơn hàng.", status: 404 };
    return { order: updated };
  }

  const { orderValues, remaining } = await takeQtyOffLine(itemRows, orderRow, itemRow, item, qty);
  await logCancelledItems([logEntry]);
  return { order: { ...decodeOrder(orderValues), items: remaining } };
}

/**
 * Guest moves to another table mid-meal: every open dine-in order of `fromTableId`
 * (pending or confirmed, not yet billed) is re-pointed to `toTableId`, so the
 * kitchen screen, the running bill and the cashier all follow the guest. If the
 * new table already has open orders they simply end up on one combined bill.
 */
export async function moveOpenTableOrders(fromTableId: string, toTableId: string): Promise<number> {
  const rows = await readAllRows(ORDERS_TAB);
  const updates = rows
    .filter((r) => {
      const o = decodeOrder(r.values);
      return o.tableId === fromTableId && !o.online && !o.billNo && (o.status === "PENDING" || o.status === "CONFIRMED");
    })
    .map((r) => ({ rowNumber: r.rowNumber, record: { ...r.values, tableId: toTableId } }));
  if (updates.length) await batchUpdateRows(ORDERS_TAB, ORDERS_HEADERS, updates);
  return updates.length;
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

/** handledBy is the username of the staff member confirming/cancelling — recorded for the monthly staff KPI review.
 * cancelReason is required by the API layer whenever status is CANCELLED (see cancellation report). */
export async function setOrderStatus(
  id: string,
  status: "CONFIRMED" | "CANCELLED",
  handledBy: string,
  cancelReason?: string,
): Promise<Order | null> {
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
    cancelReason: status === "CANCELLED" ? cancelReason || current.cancelReason : current.cancelReason,
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
    cancelReason: cell.str(next.cancelReason),
  });

  const itemRows = await readAllRows(ORDER_ITEMS_TAB);
  const items = itemRows.map((r) => decodeOrderItem(r.values)).filter((it) => it.orderId === id);
  return { ...next, items };
}

/** Orders one staff member confirmed in [fromIso, toIso], newest first — their personal "what did I take" history. */
export async function listOrdersConfirmedBy(username: string, fromIso: string, toIso: string): Promise<Order[]> {
  const all = await listOrders(undefined, 100000);
  return all
    .filter((o) => o.confirmedBy === username && o.confirmedAt && o.confirmedAt >= fromIso && o.confirmedAt <= toIso)
    .sort((a, b) => (a.confirmedAt! < b.confirmedAt! ? 1 : -1));
}

/** Cancelled orders in [fromIso, toIso], for the manager-facing cancellation report. */
export async function listCancelledOrders(fromIso: string, toIso: string): Promise<Order[]> {
  return (await listOrders("CANCELLED", 100000))
    .filter((o) => o.status === "CANCELLED" && o.cancelledAt && o.cancelledAt >= fromIso && o.cancelledAt <= toIso)
    .sort((a, b) => (a.cancelledAt! < b.cancelledAt! ? 1 : -1));
}

export type OrderWorkflowAction =
  | { type: "claim" }
  | { type: "unclaim" }
  | { type: "delivering" }
  | { type: "delivered" }
  | { type: "paid"; method: PaymentMethod }
  // Cashier screen: finalizes payment + prints a bill. Separate from "paid" above
  // (the staff quick-mark button) so that flow keeps working unchanged; this one
  // additionally stamps a stable bill number and which account a transfer went to.
  // billNo: pass the same value across a batch of calls to combine several table
  // orders under one printed bill number (see billTable() in lib/billing.ts) —
  // omit it to let a single order mint its own.
  | { type: "bill"; method: PaymentMethod; bankAccountKey: BankAccountKey | null; bankAccountLabel: string | null; billNo?: string };

/**
 * Staff workflow updates on one order. Returns the updated order, or an error
 * message when the action doesn't apply (e.g. someone else already took it).
 */
export async function applyOrderWorkflow(
  id: string,
  action: OrderWorkflowAction,
  username: string,
): Promise<{ order: Order } | { error: string; status: number }> {
  const rows = await readAllRows(ORDERS_TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return { error: "Không tìm thấy đơn hàng.", status: 404 };
  const current = decodeOrder(row.values);
  const now = new Date().toISOString();
  let patch: Record<string, string>;

  switch (action.type) {
    case "claim":
      if (current.claimedBy && current.claimedBy !== username) {
        return { error: `Đơn này đang được ${current.claimedBy} xử lý.`, status: 409 };
      }
      patch = { claimedBy: username, claimedAt: now };
      break;
    case "unclaim":
      patch = { claimedBy: "", claimedAt: "" };
      break;
    case "delivering":
    case "delivered":
      if (!current.online) return { error: "Chỉ áp dụng cho đơn online.", status: 400 };
      if (current.status !== "CONFIRMED") return { error: "Đơn chưa được xác nhận.", status: 400 };
      patch = { fulfillment: action.type === "delivering" ? "DELIVERING" : "DELIVERED", fulfilledAt: now, fulfilledBy: username };
      break;
    case "paid":
      patch = { paymentMethod: action.method, paidAt: now, paidBy: username };
      break;
    case "bill":
      if (current.status !== "CONFIRMED") return { error: "Đơn chưa được xác nhận.", status: 400 };
      // Keep the same bill number on reprint/correction instead of minting a new one each time.
      patch = {
        paymentMethod: action.method,
        paidAt: current.paidAt || now,
        paidBy: current.paidBy || username,
        billNo: current.billNo || action.billNo || genCode("HD"),
        bankAccountKey: action.bankAccountKey ?? "",
        bankAccountLabel: action.bankAccountLabel ?? "",
      };
      break;
  }

  const values = { ...row.values, ...patch };
  await updateRow(ORDERS_TAB, row.rowNumber, ORDERS_HEADERS, values);
  const itemRows = await readAllRows(ORDER_ITEMS_TAB);
  const items = itemRows.map((r) => decodeOrderItem(r.values)).filter((it) => it.orderId === id);
  return { order: { ...decodeOrder(values), items } };
}

export { ORDERS_TAB, ORDERS_HEADERS, ORDER_ITEMS_TAB, ORDER_ITEMS_HEADERS };
