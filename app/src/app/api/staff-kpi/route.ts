import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { computeStaffKpi } from "@/lib/staffKpi";
import { findUserByUsername } from "@/lib/sheets/users";

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const username = req.nextUrl.searchParams.get("username");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!username || !from || !to) {
    return NextResponse.json({ error: "Thiếu tham số username/from/to." }, { status: 400 });
  }

  const user = await findUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Không tìm thấy nhân viên." }, { status: 404 });

  const kpi = await computeStaffKpi(username, from, to);
  return NextResponse.json({ kpi });
});
