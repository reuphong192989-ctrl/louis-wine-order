import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listTableSwitchLog } from "@/lib/sheets/tableSwitchLog";

export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const entries = await listTableSwitchLog();
  return NextResponse.json({ entries });
});
