import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { createStaffCall, listStaffCalls, type StaffCallStatus } from "@/lib/sheets/staffCalls";

const schema = z.object({ tableId: z.string().trim().min(1).max(50) });

/** Customer taps "Gọi nhân viên". No auth: any table device can call. */
export const POST = withErrors(async (req: NextRequest) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu mã bàn." }, { status: 400 });
  }

  const call = await createStaffCall(parsed.data.tableId);
  return NextResponse.json({ call }, { status: 201 });
});

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  const status = req.nextUrl.searchParams.get("status") as StaffCallStatus | null;
  const calls = await listStaffCalls(status ?? undefined);
  return NextResponse.json({ calls });
});
