import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listOrdersConfirmedBy } from "@/lib/sheets/orders";
import { listTableNames } from "@/lib/sheets/tableNames";
import { todayVN } from "@/lib/site/validate";

/** The logged-in staff member's own confirmations for one day (Vietnam time) — never anyone else's. */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
  if ("error" in auth) return auth.error;

  const date = req.nextUrl.searchParams.get("date") || todayVN();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Ngày không hợp lệ." }, { status: 400 });
  const fromIso = new Date(`${date}T00:00:00+07:00`).toISOString();
  const toIso = new Date(`${date}T23:59:59.999+07:00`).toISOString();

  const [orders, tableNames] = await Promise.all([
    listOrdersConfirmedBy(auth.session.username, fromIso, toIso),
    listTableNames(),
  ]);
  const nameMap = new Map(tableNames.map((t) => [t.tableId, t.displayName]));

  return NextResponse.json({
    date,
    orders: orders.map((o) => ({
      id: o.id,
      tableId: o.tableId,
      tableLabel: o.online ? o.tableId : `Bàn ${nameMap.get(o.tableId) || o.tableId}`,
      onlineCode: o.online?.code ?? null,
      createdAt: o.createdAt,
      confirmedAt: o.confirmedAt,
      status: o.status,
      billNo: o.billNo,
      totalAmount: o.totalAmount,
      items: o.items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, note: it.note })),
    })),
  });
});
