import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { listSwitchOptions } from "@/lib/sheets/tableNames";

/** Public — the order tablet has no session and needs this to render the quick-pick room list in the switch modal. */
export const GET = withErrors(async () => {
  const options = await listSwitchOptions();
  return NextResponse.json({ options });
});
