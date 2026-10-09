import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listCancelledItems } from "@/lib/sheets/cancelledItems";
import { listTableNames } from "@/lib/sheets/tableNames";

/** Manager report: unused units guests handed back (for reconciling bar/stock counts). */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "Thiếu khoảng thời gian." }, { status: 400 });

  const [items, tableNames] = await Promise.all([listCancelledItems(from, to), listTableNames()]);
  const nameMap = new Map(tableNames.map((t) => [t.tableId, t.displayName]));

  return NextResponse.json({
    returns: items
      .filter((c) => c.scope === "return")
      .map((c) => ({
        id: c.id,
        tableLabel: nameMap.get(c.tableId) || c.tableId,
        name: c.nameSnapshot,
        qty: c.qty,
        value: c.lineTotal,
        returnedAt: c.cancelledAt,
        returnedBy: c.cancelledBy,
        note: c.cancelReason,
      })),
  });
});
