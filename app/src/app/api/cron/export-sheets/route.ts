import { NextRequest, NextResponse } from "next/server";
import { exportReports } from "@/lib/report-export";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron (vercel.json, daily 23:30 Vietnam time) → rewrite the report tabs in
 * the Google Sheet. Vercel sends `Authorization: Bearer $CRON_SECRET` when that
 * env var is set; without it the endpoint refuses to run.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await exportReports()) });
  } catch (e) {
    console.error("report export failed", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "export failed" }, { status: 500 });
  }
}
