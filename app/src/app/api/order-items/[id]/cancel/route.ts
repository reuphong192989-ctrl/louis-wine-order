import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { cancelOrderItem } from "@/lib/sheets/orders";

const schema = z.object({
  // Omitted = the whole line. Partial: guest keeps 1 of the 3 ordered, etc.
  qty: z.number().positive().max(999).nullable().optional(),
  reason: z.string().trim().min(1, "Vui lòng nhập lý do huỷ.").max(500),
});

/** Guest takes back a dish after the order was confirmed (already sent to the kitchen). */
export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const result = await cancelOrderItem(id, parsed.data.qty ?? null, parsed.data.reason, auth.session);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ order: result.order });
});
