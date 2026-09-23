import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { deleteTableName } from "@/lib/sheets/tableNames";

/** Manager clears a table's custom name — it goes back to showing its raw code. */
export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const { tableId } = await params;
  const ok = await deleteTableName(decodeURIComponent(tableId));
  if (!ok) return NextResponse.json({ error: "Bàn này chưa có tên riêng." }, { status: 404 });

  return NextResponse.json({ ok: true });
});
