import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listCancelledOrders } from "@/lib/sheets/orders";
import { listCancelledItems } from "@/lib/sheets/cancelledItems";
import { listTableNames } from "@/lib/sheets/tableNames";

/** Manager-facing cancellation report — who cancelled what, when, and why (whole orders and single dishes). */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "Thiếu khoảng thời gian." }, { status: 400 });

  const [orders, cancelledItems, tableNames] = await Promise.all([
    listCancelledOrders(from, to),
    listCancelledItems(from, to),
    listTableNames(),
  ]);
  const nameMap = new Map(tableNames.map((t) => [t.tableId, t.displayName]));

  // Tables switched via the staff "Đổi bàn" flow are named "<tầng>-<số bàn>" (e.g. "2-05") —
  // best-effort only: plain/custom table codes without that pattern just leave "floor" blank.
  const floorOf = (tableId: string): string | null => {
    const [first, ...rest] = tableId.split("-");
    return rest.length > 0 && /^\d+$/.test(first) ? first : null;
  };

  const orderRows = orders.map((o) => ({
    id: o.id,
    kind: "order" as const,
    tableId: o.tableId,
    tableLabel: nameMap.get(o.tableId) || o.tableId,
    floor: floorOf(o.tableId),
    online: o.online ? o.online.channel : null,
    cancelledAt: o.cancelledAt,
    cancelledBy: o.cancelledBy,
    cancelReason: o.cancelReason,
    totalAmount: o.totalAmount,
    afterConfirm: !!o.confirmedAt,
    confirmedBy: o.confirmedBy,
    dishes: o.items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, kitchenStatus: it.kitchenStatus })),
  }));

  // Whole-order cancels are already listed above; here only single dishes taken back from a still-open order.
  const itemRows = cancelledItems
    .filter((c) => c.scope === "item")
    .map((c) => ({
      id: c.id,
      kind: "item" as const,
      tableId: c.tableId,
      tableLabel: nameMap.get(c.tableId) || c.tableId,
      floor: floorOf(c.tableId),
      online: null,
      cancelledAt: c.cancelledAt,
      cancelledBy: c.cancelledBy,
      cancelReason: c.cancelReason,
      totalAmount: c.lineTotal,
      afterConfirm: true,
      confirmedBy: null,
      dishes: [{ name: c.nameSnapshot, qty: c.qty, kitchenStatus: c.kitchenStatus }],
    }));

  const cancellations = [...orderRows, ...itemRows].sort((a, b) => ((a.cancelledAt ?? "") < (b.cancelledAt ?? "") ? 1 : -1));
  return NextResponse.json({ cancellations });
});
