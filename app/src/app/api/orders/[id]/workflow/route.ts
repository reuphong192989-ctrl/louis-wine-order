import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { applyOrderWorkflow } from "@/lib/sheets/orders";
import { getBankAccounts } from "@/lib/sheets/settings";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim") }),
  z.object({ action: z.literal("unclaim") }),
  z.object({ action: z.literal("delivering") }),
  z.object({ action: z.literal("delivered") }),
  z.object({ action: z.literal("paid"), method: z.enum(["CASH", "TRANSFER"]) }),
  z.object({ action: z.literal("bill"), method: z.enum(["CASH", "TRANSFER"]), bankAccountKey: z.enum(["no_invoice", "invoice"]).nullable() }),
]);

function bankAccountLabel(key: "no_invoice" | "invoice", info: { bank: string; number: string; holder: string } | null): string {
  if (!info) return "";
  const tag = key === "invoice" ? "cần xuất hoá đơn" : "không xuất hoá đơn";
  return `${info.bank} · ${info.number} · ${info.holder} (${tag})`;
}

/** Staff/cashier workflow on an order: take it ("Tôi nhận xử lý"), then — website orders — out for delivery, delivered, paid; "bill" is the cashier screen's finalize-payment-and-print action. */
export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF", "CASHIER"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });

  const a = parsed.data;
  if (a.action === "bill" && a.method === "TRANSFER" && !a.bankAccountKey) {
    return NextResponse.json({ error: "Vui lòng chọn tài khoản nhận chuyển khoản." }, { status: 400 });
  }

  let action: Parameters<typeof applyOrderWorkflow>[1];
  if (a.action === "paid") {
    action = { type: "paid", method: a.method };
  } else if (a.action === "bill") {
    const label =
      a.method === "TRANSFER" && a.bankAccountKey ? bankAccountLabel(a.bankAccountKey, (await getBankAccounts())[a.bankAccountKey === "invoice" ? "invoice" : "noInvoice"]) : "";
    action = { type: "bill", method: a.method, bankAccountKey: a.method === "TRANSFER" ? a.bankAccountKey : null, bankAccountLabel: label || null };
  } else {
    action = { type: a.action };
  }

  const result = await applyOrderWorkflow(id, action, auth.session.username);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ order: result.order });
});
