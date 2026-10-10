import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listCancelledItems } from "@/lib/sheets/cancelledItems";
import { listTableNames } from "@/lib/sheets/tableNames";

const WINDOW_MS = 3 * 3600 * 1000;

/** Dishes taken back after confirmation in the last few hours — the kitchen screen flashes these so cooks stop. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "KITCHEN"]);
  if ("error" in auth) return auth.error;

  const now = Date.now();
  const [items, tableNames] = await Promise.all([
    listCancelledItems(new Date(now - WINDOW_MS).toISOString(), new Date(now + 60_000).toISOString()),
    listTableNames(),
  ]);
  const nameMap = new Map(tableNames.map((t) => [t.tableId, t.displayName]));

  return NextResponse.json({
    // Returned unused units (beer, cigars…) are not something the kitchen needs to stop.
    cancellations: items.filter((c) => c.scope !== "return").map((c) => ({
      id: c.id,
      tableId: c.tableId,
      tableLabel: nameMap.get(c.tableId) || c.tableId,
      name: c.nameSnapshot,
      qty: c.qty,
      kitchenStatus: c.kitchenStatus,
      scope: c.scope,
      cancelledAt: c.cancelledAt,
      cancelledBy: c.cancelledBy,
      cancelReason: c.cancelReason,
    })),
  });
});
