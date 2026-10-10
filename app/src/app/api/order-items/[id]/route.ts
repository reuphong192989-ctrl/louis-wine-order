import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { setOrderItemQty, setOrderItemStatus } from "@/lib/sheets/orders";
import { notifyPush } from "@/lib/push";

const statusSchema = z.object({ kitchenStatus: z.enum(["PENDING", "COOKING", "DONE"]) });
// Weighed items (fish by the kg…) need decimals: 1.2 kg. Rounded to 2 places.
const qtySchema = z.object({ qty: z.number().positive("Số lượng phải lớn hơn 0.").max(999, "Số lượng tối đa 999.") });

/** Kitchen updates a line's cooking status; staff/cashier correct its quantity (e.g. real weight). */
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const qtyParsed = qtySchema.safeParse(body);
  if (qtyParsed.success) {
    const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
    if ("error" in auth) return auth.error;
    const qty = Math.round(qtyParsed.data.qty * 100) / 100;
    if (qty <= 0) return NextResponse.json({ error: "Số lượng phải lớn hơn 0." }, { status: 400 });
    const result = await setOrderItemQty(id, qty);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ order: result.order });
  }
  if (body && typeof body === "object" && "qty" in body) {
    return NextResponse.json({ error: qtyParsed.error.issues[0]?.message ?? "Số lượng không hợp lệ." }, { status: 400 });
  }

  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "KITCHEN"]);
  if ("error" in auth) return auth.error;

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  const order = await setOrderItemStatus(id, parsed.data.kitchenStatus);
  if (!order) return NextResponse.json({ error: "Không tìm thấy món trong đơn." }, { status: 404 });

  // Kitchen just finished the last item of this order — tell staff instead of relying on the radio.
  if (order.status === "CONFIRMED" && order.items.length > 0 && order.items.every((it) => it.kitchenStatus === "DONE")) {
    after(() =>
      notifyPush(["OWNER", "ADMIN", "STAFF"], {
        title: "Bếp đã làm xong",
        body: order.online ? `${order.tableId} · tất cả món đã xong` : `Bàn ${order.tableId} — tất cả món đã xong`,
        tag: `lwo-done-${order.id}`,
        url: "/staff",
      }),
    );
  }

  return NextResponse.json({ order });
});
