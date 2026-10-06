import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { getBankAccounts } from "@/lib/sheets/settings";

/** Cashier/manager read access to the 2 configured payment accounts — distinct from
 * /api/admin/integrations (OWNER/ADMIN-only) since CASHIER needs this to take payment. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN", "CASHIER"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getBankAccounts());
});
