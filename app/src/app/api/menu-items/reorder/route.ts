import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { reorderItemsInCategory } from "@/lib/sheets/menuItems";

const schema = z.object({
  categoryId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  await reorderItemsInCategory(parsed.data.categoryId, parsed.data.orderedIds);
  return NextResponse.json({ ok: true });
});
