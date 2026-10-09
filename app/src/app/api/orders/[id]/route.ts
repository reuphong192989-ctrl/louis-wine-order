import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { cancelOrder, deleteOrder, findOrderById, setOrderStatus } from "@/lib/sheets/orders";

const patchSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("CONFIRMED") }),
  z.object({ status: z.literal("CANCELLED"), cancelReason: z.string().trim().min(1, "Vui lòng nhập lý do huỷ.").max(500) }),
]);

/**
 * Public status check for the customer's own order (polled while waiting for
 * staff to confirm/cancel). The id is an unguessable UUID the customer
 * already holds from their own POST /api/orders response, so no auth needed.
 */
export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const order = await findOrderById(id);
  if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
  return NextResponse.json({ order: { id: order.id, tableId: order.tableId, status: order.status } });
});

/** Staff acknowledges ("đã nhận đơn") or cancels an order. */
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Trạng thái không hợp lệ." }, { status: 400 });
  }

  if (parsed.data.status === "CANCELLED") {
    // Works before AND after confirmation; after it, kitchen-started dishes need a manager.
    const result = await cancelOrder(id, parsed.data.cancelReason, auth.session);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ order: result.order });
  }

  const order = await setOrderStatus(id, parsed.data.status, auth.session.username);
  if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });

  return NextResponse.json({ order });
});

/** Owner permanently deletes a single order and its line items from history. Irreversible. */
export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const ok = await deleteOrder(id);
  if (!ok) return NextResponse.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });

  return NextResponse.json({ ok: true });
});
