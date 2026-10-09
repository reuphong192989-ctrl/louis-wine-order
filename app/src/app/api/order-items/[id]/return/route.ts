import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { returnOrderItem } from "@/lib/sheets/orders";

const schema = z.object({
  qty: z.number().positive("Số lượng trả lại phải lớn hơn 0.").max(999),
  note: z.string().trim().max(300).nullable().optional(),
});

/** Guest hands back unused, untouched units (beer, unopened wine, cigars, towels) before paying. */
export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const result = await returnOrderItem(id, parsed.data.qty, parsed.data.note || null, auth.session);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ order: result.order });
});
