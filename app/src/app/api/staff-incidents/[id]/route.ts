import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { deleteStaffIncident } from "@/lib/sheets/staffIncidents";

/** Manager removes a wrongly-entered incident record. */
export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const ok = await deleteStaffIncident(id);
  if (!ok) return NextResponse.json({ error: "Không tìm thấy bản ghi." }, { status: 404 });

  return NextResponse.json({ ok: true });
});
