import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { applyOrderWorkflow } from "@/lib/sheets/orders";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim") }),
  z.object({ action: z.literal("unclaim") }),
  z.object({ action: z.literal("delivering") }),
  z.object({ action: z.literal("delivered") }),
  z.object({ action: z.literal("paid"), method: z.enum(["CASH", "TRANSFER"]) }),
]);

/** Staff workflow on an order: take it ("Tôi nhận xử lý"), then — website orders — out for delivery, delivered, paid. */
export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });

  const a = parsed.data;
  const result = await applyOrderWorkflow(
    id,
    a.action === "paid" ? { type: "paid", method: a.method } : { type: a.action },
    auth.session.username,
  );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ order: result.order });
});
