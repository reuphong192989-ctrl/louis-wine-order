import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { listOrders } from "@/lib/sheets/orders";
import { normalizeTableId } from "@/lib/table-id";

export const dynamic = "force-dynamic";

// A sitting rarely lasts longer than this; older unbilled orders are not shown to the next guests.
const WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Public — the table's own tablet / QR page shows "Món đã gọi": what this table has
 * ordered since its last bill (dish names, quantities, kitchen state). No guest data
 * is involved; billed and website orders are never returned.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const raw = req.nextUrl.searchParams.get("tableId") ?? "";
  const tableId = normalizeTableId(raw);
  if (!tableId || tableId.length > 50) return NextResponse.json({ error: "Thiếu mã bàn." }, { status: 400 });

  const since = Date.now() - WINDOW_MS;
  const orders = (await listOrders(undefined, 100000))
    .filter((o) => o.tableId === tableId && !o.online && !o.billNo && new Date(o.createdAt).getTime() >= since)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  const rounds = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    status: o.status,
    items: o.items.map((it) => ({
      name: it.nameSnapshot,
      qty: it.qty,
      lineTotal: it.lineTotal,
      kitchenStatus: it.kitchenStatus,
    })),
    total: o.totalAmount,
  }));
  const total = rounds.filter((r) => r.status !== "CANCELLED").reduce((s, r) => s + r.total, 0);
  return NextResponse.json({ tableId, rounds, total });
});
