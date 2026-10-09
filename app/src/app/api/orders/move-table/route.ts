import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { moveOpenTableOrders } from "@/lib/sheets/orders";
import { logTableSwitch } from "@/lib/sheets/tableSwitchLog";

const schema = z.object({
  fromTableId: z.string().trim().min(1).max(50),
  toTableId: z.string().trim().min(1, "Vui lòng chọn bàn mới.").max(50),
});

/** Guest changes table mid-meal: move every open order (incl. what's already in the kitchen) to the new table. */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { fromTableId, toTableId } = parsed.data;
  if (fromTableId === toTableId) return NextResponse.json({ error: "Bàn mới trùng bàn hiện tại." }, { status: 400 });

  const moved = await moveOpenTableOrders(fromTableId, toTableId);
  if (moved === 0) {
    return NextResponse.json({ error: "Bàn này không còn đơn nào đang phục vụ để chuyển." }, { status: 404 });
  }

  await logTableSwitch({
    previousTableId: fromTableId,
    newTableId: toTableId,
    username: auth.session.username,
    role: auth.session.role,
    kind: "orders",
  });

  return NextResponse.json({ moved });
});
