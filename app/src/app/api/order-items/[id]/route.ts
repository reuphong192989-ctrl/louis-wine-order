import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { setOrderItemStatus } from "@/lib/sheets/orders";

const patchSchema = z.object({ kitchenStatus: z.enum(["PENDING", "COOKING", "DONE"]) });

/** Kitchen updates a single line item's cooking status. */
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  const order = await setOrderItemStatus(id, parsed.data.kitchenStatus);
  if (!order) return NextResponse.json({ error: "Không tìm thấy món trong đơn." }, { status: 404 });

  return NextResponse.json({ order });
});
