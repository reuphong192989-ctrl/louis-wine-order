import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { findMenuItemsByIds } from "@/lib/sheets/menuItems";
import { createOrder, listOrders, type OrderStatus } from "@/lib/sheets/orders";

const orderSchema = z.object({
  tableId: z.string().trim().min(1).max(50),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        qty: z.number().int().positive().max(999),
        note: z.string().trim().max(300).optional(),
      })
    )
    .min(1, "Giỏ hàng đang trống."),
});

/** Customer submits their cart — this is the "Gửi yêu cầu tới nhân viên" action. No auth: any table device can order. */
export const POST = withErrors(async (req: NextRequest) => {
  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const ids = parsed.data.items.map((i) => i.menuItemId);
  const byId = await findMenuItemsByIds(ids);

  const lines: { menuItemId: string; nameSnapshot: string; unitPrice: number; qty: number; lineTotal: number; note: string | null }[] = [];

  for (const line of parsed.data.items) {
    const item = byId.get(line.menuItemId);
    if (!item) {
      return NextResponse.json({ error: "Một món trong giỏ hàng không còn tồn tại. Vui lòng tải lại menu." }, { status: 400 });
    }
    if (!item.available) {
      return NextResponse.json({ error: `Món "${item.name}" vừa hết hàng, vui lòng bỏ khỏi giỏ.` }, { status: 400 });
    }
    if (item.priceValue == null) {
      return NextResponse.json(
        { error: `Món "${item.name}" chưa có giá cố định (${item.priceText}) — vui lòng gọi nhân viên để đặt món này.` },
        { status: 400 }
      );
    }
    const lineTotal = item.priceValue * line.qty;
    lines.push({
      menuItemId: item.id,
      nameSnapshot: item.name,
      unitPrice: item.priceValue,
      qty: line.qty,
      lineTotal,
      note: line.note?.trim() || null,
    });
  }

  const order = await createOrder({ tableId: parsed.data.tableId, lines });
  return NextResponse.json({ order }, { status: 201 });
});

/** Staff / admin: list recent orders, optionally filtered by status. */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;

  const status = req.nextUrl.searchParams.get("status") as OrderStatus | null;
  const orders = await listOrders(status ?? undefined);
  return NextResponse.json({ orders });
});
