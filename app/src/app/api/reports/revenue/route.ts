import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listAllOrdersRaw } from "@/lib/sheets/orders";

/**
 * Revenue report — admin only. Counts only CONFIRMED orders (pending/cancelled
 * don't count as revenue). `from`/`to` are ISO timestamps computed client-side
 * from the viewer's local timezone, so "today"/"this month" line up with what
 * the restaurant actually considers today, not the server's timezone.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "Thiếu khoảng thời gian (from/to)." }, { status: 400 });
  }
  const from = new Date(fromParam);
  const to = new Date(toParam);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Khoảng thời gian không hợp lệ." }, { status: 400 });
  }

  const all = await listAllOrdersRaw();
  const confirmed = all.filter((o) => {
    if (o.status !== "CONFIRMED") return false;
    const t = new Date(o.createdAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });

  const totalRevenue = confirmed.reduce((s, o) => s + o.totalAmount, 0);
  const orderCount = confirmed.length;

  const byDayMap = new Map<string, { revenue: number; orderCount: number }>();
  for (const o of confirmed) {
    const day = o.createdAt.slice(0, 10);
    const entry = byDayMap.get(day) ?? { revenue: 0, orderCount: 0 };
    entry.revenue += o.totalAmount;
    entry.orderCount += 1;
    byDayMap.set(day, entry);
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return NextResponse.json({ totalRevenue, orderCount, byDay });
});
