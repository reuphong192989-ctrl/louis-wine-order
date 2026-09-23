import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { listTableNames, upsertTableName } from "@/lib/sheets/tableNames";

/** Public — the customer order page, staff dashboard, and kitchen dashboard all need this to resolve a raw table code to its friendly display name, and none of them have a session. */
export const GET = withErrors(async () => {
  const entries = await listTableNames();
  return NextResponse.json({ tableNames: entries.map((e) => ({ tableId: e.tableId, displayName: e.displayName })) });
});

const upsertSchema = z.object({
  tableId: z.string().trim().min(1).max(50),
  displayName: z.string().trim().min(1, "Vui lòng nhập tên hiển thị.").max(60),
});

/** Manager sets/renames a table's display name (e.g. "01" -> "Platinum 1"). */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const entry = await upsertTableName(parsed.data.tableId, parsed.data.displayName, auth.session.username);
  return NextResponse.json({ entry });
});
