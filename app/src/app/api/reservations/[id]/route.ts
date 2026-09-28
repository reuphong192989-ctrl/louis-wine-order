import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { RESERVATION_STATUSES, setReservationStatus } from "@/lib/sheets/reservations";

const patchSchema = z.object({ status: z.enum(RESERVATION_STATUSES as [string, ...string[]]) });

/** Staff / admin: move a reservation through new → confirmed → seated → completed (or cancelled). */
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  const r = await setReservationStatus(id, parsed.data.status as (typeof RESERVATION_STATUSES)[number], auth.session.username);
  if (!r) return NextResponse.json({ error: "Không tìm thấy lượt đặt bàn." }, { status: 404 });
  return NextResponse.json({ reservation: r });
});
