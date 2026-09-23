import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listKnownTableIds } from "@/lib/sheets/tableNames";

/** Every raw table code seen in orders/calls/switch history — feeds the autocomplete in the rename form. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const tableIds = await listKnownTableIds();
  return NextResponse.json({ tableIds });
});
