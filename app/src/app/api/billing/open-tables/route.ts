import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listOpenTableBills } from "@/lib/billing";

/** Cashier worklist: tables with confirmed orders not yet billed. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN", "CASHIER"]);
  if ("error" in auth) return auth.error;

  return NextResponse.json({ tables: await listOpenTableBills() });
});
