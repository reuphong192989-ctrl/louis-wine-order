import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { listOrders } from "@/lib/sheets/orders";
import { listReservations } from "@/lib/sheets/reservations";
import { todayVN } from "@/lib/site/validate";

export const dynamic = "force-dynamic";

/**
 * Lumia front-desk board: room-delivery orders from the last 2 days and Lumia
 * guests' table bookings from today on (with shuttle pickup times). Only Lumia
 * data — the front desk doesn't see other restaurant orders.
 */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "RECEPTION"]);
  if ("error" in auth) return auth.error;

  const since = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const today = todayVN();
  const [orders, reservations] = await Promise.all([listOrders(undefined, 1000), listReservations(1000)]);

  return NextResponse.json({
    orders: orders.filter((o) => o.online?.channel === "LUMIA_ROOM" && o.createdAt >= since),
    reservations: reservations.filter((r) => r.isLumiaGuest && r.date >= today && r.status !== "CANCELLED"),
    today,
  });
});
