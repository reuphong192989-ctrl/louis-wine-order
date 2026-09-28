import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { dataBackend } from "@/lib/sheets/core";
import { migrateSheetsToPostgres, postgresCounts } from "@/lib/sheets/migrate";

export const dynamic = "force-dynamic";
// Copying every tab can take a while on a large sheet (Hobby plan allows up to 60s).
export const maxDuration = 60;

/** OWNER/ADMIN: current storage backend + row counts already in PostgreSQL. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ backend: dataBackend(), postgres: await postgresCounts() });
});

/** OWNER/ADMIN: copy Google Sheets → PostgreSQL. Body: { force?: boolean }. The Sheet is only read. */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  if (dataBackend() === "postgres") {
    return NextResponse.json(
      { error: "App đang chạy trên PostgreSQL — không chép lại từ Google Sheets để tránh ghi đè dữ liệu mới." },
      { status: 409 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const results = await migrateSheetsToPostgres({ force: body?.force === true });
  return NextResponse.json({ results });
});
