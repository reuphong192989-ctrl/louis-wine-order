import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listOpenTableBills } from "@/lib/billing";

/** Tables with confirmed orders not yet billed — cashier worklist, and (read-only) the waiter's running-bill list. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
  if ("error" in auth) return auth.error;

  return NextResponse.json({ tables: await listOpenTableBills() });
});
