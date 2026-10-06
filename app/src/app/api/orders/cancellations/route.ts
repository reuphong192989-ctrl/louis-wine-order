import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listCancelledOrders } from "@/lib/sheets/orders";
import { listTableNames } from "@/lib/sheets/tableNames";

/** Manager-facing cancellation report — who cancelled what, when, and why. */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "Thiếu khoảng thời gian." }, { status: 400 });

  const [orders, tableNames] = await Promise.all([listCancelledOrders(from, to), listTableNames()]);
  const nameMap = new Map(tableNames.map((t) => [t.tableId, t.displayName]));

  // Tables switched via the staff "Đổi bàn" flow are named "<tầng>-<số bàn>" (e.g. "2-05") —
  // best-effort only: plain/custom table codes without that pattern just leave "floor" blank.
  const floorOf = (tableId: string): string | null => {
    const [first, ...rest] = tableId.split("-");
    return rest.length > 0 && /^\d+$/.test(first) ? first : null;
  };

  const cancellations = orders.map((o) => ({
    id: o.id,
    tableId: o.tableId,
    tableLabel: nameMap.get(o.tableId) || o.tableId,
    floor: floorOf(o.tableId),
    online: o.online ? o.online.channel : null,
    cancelledAt: o.cancelledAt,
    cancelledBy: o.cancelledBy,
    cancelReason: o.cancelReason,
    totalAmount: o.totalAmount,
  }));

  return NextResponse.json({ cancellations });
});
