import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { exportReports } from "@/lib/report-export";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** OWNER/ADMIN: "Xuất báo cáo ngay" — same export as the nightly cron. */
export const POST = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ ok: true, ...(await exportReports()) });
});
