import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { acknowledgeStaffCall } from "@/lib/sheets/staffCalls";

/** Staff marks a "gọi nhân viên" request as handled. */
export const PATCH = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const call = await acknowledgeStaffCall(id, auth.session.username);
  if (!call) return NextResponse.json({ error: "Không tìm thấy yêu cầu." }, { status: 404 });

  return NextResponse.json({ call });
});
