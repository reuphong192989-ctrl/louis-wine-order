import { randomUUID } from "crypto";
import { appendRows, readAllRowsCached, cell } from "./core";

const TAB = "CancelledItems";
// One row per dish taken back AFTER staff had confirmed the order (i.e. after it
// reached the kitchen). scope "item" = only that dish/part of it was cancelled;
// scope "order" = the whole order was cancelled and this is one of its dishes.
// scope "return" = NOT a cancellation: the guest handed back unused, untouched units
// (unopened beer, cigars…) — goes back to stock, never shown to the kitchen.
// kitchenStatus is the dish's state at the moment of cancelling (food cost check).
// costBearer: who absorbs a dish the kitchen had already started — "RESTAURANT"
// (waste) or "STAFF" (costBearerStaff = that staff member); empty when nothing was cooked.
const HEADERS = [
  "id",
  "orderId",
  "itemId",
  "tableId",
  "nameSnapshot",
  "unitPrice",
  "qty",
  "lineTotal",
  "kitchenStatus",
  "scope",
  "cancelledAt",
  "cancelledBy",
  "cancelReason",
  "costBearer",
  "costBearerStaff",
];

export type CancelScope = "item" | "order" | "return";
export type CostBearer = "RESTAURANT" | "STAFF";

export type CancelledItem = {
  id: string;
  orderId: string;
  itemId: string;
  tableId: string;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  kitchenStatus: "PENDING" | "COOKING" | "DONE";
  scope: CancelScope;
  cancelledAt: string;
  cancelledBy: string;
  cancelReason: string;
  costBearer: CostBearer | null;
  costBearerStaff: string | null;
};

function decode(v: Record<string, string>): CancelledItem {
  return {
    id: v.id,
    orderId: v.orderId,
    itemId: v.itemId,
    tableId: v.tableId,
    nameSnapshot: v.nameSnapshot,
    unitPrice: cell.toInt(v.unitPrice),
    qty: Number(v.qty) || 0,
    lineTotal: cell.toInt(v.lineTotal),
    kitchenStatus: (v.kitchenStatus || "PENDING") as CancelledItem["kitchenStatus"],
    scope: (v.scope || "item") as CancelScope,
    cancelledAt: v.cancelledAt,
    cancelledBy: v.cancelledBy,
    cancelReason: v.cancelReason,
    costBearer: (cell.strOrNull(v.costBearer ?? "") as CostBearer | null),
    costBearerStaff: cell.strOrNull(v.costBearerStaff ?? ""),
  };
}

export async function logCancelledItems(entries: Omit<CancelledItem, "id">[]): Promise<void> {
  if (!entries.length) return;
  await appendRows(
    TAB,
    HEADERS,
    entries.map((e) => ({
      id: randomUUID(),
      orderId: e.orderId,
      itemId: e.itemId,
      tableId: e.tableId,
      nameSnapshot: e.nameSnapshot,
      unitPrice: cell.int(e.unitPrice),
      qty: String(e.qty),
      lineTotal: cell.int(e.lineTotal),
      kitchenStatus: e.kitchenStatus,
      scope: e.scope,
      cancelledAt: e.cancelledAt,
      cancelledBy: e.cancelledBy,
      cancelReason: e.cancelReason,
      costBearer: cell.str(e.costBearer),
      costBearerStaff: cell.str(e.costBearerStaff),
    })),
  );
}

/** Cancellations in [fromIso, toIso], newest first. */
export async function listCancelledItems(fromIso: string, toIso: string): Promise<CancelledItem[]> {
  const rows = await readAllRowsCached(TAB, 2_000);
  return rows
    .map((r) => decode(r.values))
    .filter((c) => c.cancelledAt >= fromIso && c.cancelledAt <= toIso)
    .sort((a, b) => (a.cancelledAt < b.cancelledAt ? 1 : -1));
}

export const CANCELLED_ITEMS_TAB = TAB;
export const CANCELLED_ITEMS_HEADERS = HEADERS;
