import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { deleteOrdersInRange } from "@/lib/sheets/orders";

const schema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

/** Owner permanently deletes every order created within a date range, plus their line items. Irreversible. */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER"]);
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  if (parsed.data.from > parsed.data.to) {
    return NextResponse.json({ error: "Khoảng thời gian không hợp lệ." }, { status: 400 });
  }

  const count = await deleteOrdersInRange(parsed.data.from, parsed.data.to);
  return NextResponse.json({ deletedCount: count });
});
