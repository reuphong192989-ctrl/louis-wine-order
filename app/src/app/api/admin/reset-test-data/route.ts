import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { countTestData, resetTestData } from "@/lib/sheets/reset-test-data";

export const dynamic = "force-dynamic";

// Must match exactly (case/diacritics-sensitive) — a typed confirmation, not just a click, for an
// irreversible action that empties every order/bill/reservation/etc. the restaurant has ever recorded.
const CONFIRM_PHRASE = "XOÁ DỮ LIỆU TEST";

/** OWNER-only: row counts per tab a reset would clear — what the confirmation screen shows before anyone commits. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ tabs: await countTestData(), confirmPhrase: CONFIRM_PHRASE });
});

const schema = z.object({ confirm: z.string() });

/**
 * OWNER-only, irreversible: permanently empties every order, bill, cancellation/return, staff call,
 * reservation, table-switch log and review — for wiping pre-launch test activity before the menu starts
 * recording real revenue. The menu, accounts, table names and bank settings are never touched.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER"]);
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json({ error: `Vui lòng gõ đúng "${CONFIRM_PHRASE}" để xác nhận.` }, { status: 400 });
  }

  const deleted = await resetTestData();
  return NextResponse.json({ deleted });
});
