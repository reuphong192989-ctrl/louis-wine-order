import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { RESERVATION_STATUSES, claimReservation, setReservationStatus, setShuttleDone } from "@/lib/sheets/reservations";

const patchSchema = z.union([
  z.object({ status: z.enum(RESERVATION_STATUSES as [string, ...string[]]) }),
  z.object({ claim: z.boolean() }),
  z.object({ shuttleDone: z.boolean() }),
]);

/**
 * Staff / admin: move a booking through new → confirmed → seated → completed (or cancelled),
 * or take it ("Tôi nhận xử lý"). The Lumia front desk may only mark the shuttle pickup.
 */
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  const body = parsed.data;
  const { id } = await params;

  if ("shuttleDone" in body) {
    const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "RECEPTION"]);
    if ("error" in auth) return auth.error;
    const r = await setShuttleDone(id, auth.session.username, body.shuttleDone);
    if (!r) return NextResponse.json({ error: "Không tìm thấy lượt đặt bàn." }, { status: 404 });
    return NextResponse.json({ reservation: r });
  }

  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  if ("claim" in body) {
    const result = await claimReservation(id, auth.session.username, !body.claim);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ reservation: result.reservation });
  }

  const r = await setReservationStatus(id, body.status as (typeof RESERVATION_STATUSES)[number], auth.session.username);
  if (!r) return NextResponse.json({ error: "Không tìm thấy lượt đặt bàn." }, { status: 404 });
  return NextResponse.json({ reservation: r });
});
