import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { applyImport, buildPlan, lastImportRun, undoLastImport } from "@/lib/sheets/menuImport";

/** OWNER/ADMIN: preview of what importing the Book1 list would change (read-only) + the last import run. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  const [plan, last] = await Promise.all([buildPlan(), lastImportRun()]);
  return NextResponse.json({ plan, last });
});

const bodySchema = z.object({ action: z.enum(["apply", "undo"]), confirm: z.literal(true) });

/** Apply the previewed import, or undo the most recent one. Needs an explicit `confirm: true`. */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cần xác nhận rõ ràng (confirm) để thực hiện." }, { status: 400 });

  if (parsed.data.action === "apply") {
    const result = await applyImport(auth.session.username);
    return NextResponse.json({ ok: true, ...result });
  }
  const result = await undoLastImport(auth.session.username);
  if (!result) return NextResponse.json({ error: "Không có lần nhập nào để hoàn tác." }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
});
