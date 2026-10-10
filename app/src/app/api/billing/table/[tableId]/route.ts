import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { previewTableBill, finalizeTableBill } from "@/lib/billing";

/** Read-only combined preview for one table (doesn't mark anything as billed) — waiters use it as the running bill ("tạm tính"). */
export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
  if ("error" in auth) return auth.error;

  const { tableId } = await params;
  const bill = await previewTableBill(decodeURIComponent(tableId));
  if (!bill) return NextResponse.json({ error: "Bàn này không có đơn nào đã xác nhận mà chưa thanh toán." }, { status: 404 });
  return NextResponse.json({ bill });
});

const finalizeSchema = z.object({
  guestCount: z.number().int().min(0).max(999).nullable(),
  discountAmount: z.number().int().min(0),
  method: z.enum(["CASH", "TRANSFER"]),
  bankAccountKey: z.enum(["no_invoice", "invoice"]).nullable(),
  bankAccountLabel: z.string().trim().max(200).nullable(),
});

/** Combines every open order for the table under one bill number — this is what the cashier prints. */
export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "CASHIER"]);
  if ("error" in auth) return auth.error;

  const { tableId } = await params;
  const parsed = finalizeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  // Transfers go only to the company account (with a VAT invoice); no invoice → cash.
  if (parsed.data.method === "TRANSFER" && parsed.data.bankAccountKey !== "invoice") {
    return NextResponse.json({ error: "Chuyển khoản chỉ nhận vào tài khoản công ty (có xuất hoá đơn). Khách không lấy hoá đơn thì thanh toán tiền mặt." }, { status: 400 });
  }

  const result = await finalizeTableBill(decodeURIComponent(tableId), { ...parsed.data, printedBy: auth.session.username });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ bill: result.bill });
});
