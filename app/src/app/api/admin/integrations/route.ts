import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { notifyStaff } from "@/lib/site/notify";
import { getBankAccounts, getGoogleRating, setSettings } from "@/lib/sheets/settings";

export const dynamic = "force-dynamic";

function status() {
  return {
    sheets: !!(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    cron: !!process.env.CRON_SECRET,
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    telegramLumia: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_LUMIA_CHAT_ID),
    qrSecret: !!process.env.LUMIA_QR_SECRET,
  };
}

const googleSchema = z.object({
  action: z.literal("google-rating"),
  rating: z.number().min(1).max(5).nullable(),
  count: z.number().int().min(0).max(1_000_000).nullable(),
  reviewUrl: z
    .string()
    .trim()
    .max(300)
    .refine((u) => u === "" || /^https:\/\/([a-z0-9-]+\.)*(google\.[a-z.]+|g\.page|goo\.gl)\//i.test(u), "Link phải là link Google (g.page, google.com, goo.gl).")
    .nullable(),
});

/** OWNER/ADMIN: which integrations are configured (no secret values are returned) + the Google rating shown on the site. */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ ...status(), google: await getGoogleRating(), bankAccounts: await getBankAccounts() });
});

const bankAccountSchema = z.object({ bank: z.string().trim().max(100), number: z.string().trim().max(50), holder: z.string().trim().max(100) });
const bankAccountsSchema = z.object({ action: z.literal("bank-accounts"), noInvoice: bankAccountSchema, invoice: bankAccountSchema });

/**
 * OWNER/ADMIN:
 * - {} : Telegram test message to the restaurant (and Lumia) groups
 * - { action: "google-rating", rating, count, reviewUrl }: update the Google Maps rating shown on the website
 * - { action: "bank-accounts", noInvoice, invoice }: the 2 accounts the cashier screen picks from when a payment is by transfer
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));

  if (body?.action === "google-rating") {
    const parsed = googleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
    const { rating, count, reviewUrl } = parsed.data;
    await setSettings(
      { googleRating: rating === null ? "" : rating.toFixed(1), googleCount: count === null ? "" : String(count), googleReviewUrl: reviewUrl ?? "" },
      auth.session.username,
    );
    return NextResponse.json({ ok: true, google: await getGoogleRating() });
  }

  if (body?.action === "bank-accounts") {
    const parsed = bankAccountsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
    const { noInvoice, invoice } = parsed.data;
    await setSettings(
      {
        bankNoInvoiceBank: noInvoice.bank,
        bankNoInvoiceNumber: noInvoice.number,
        bankNoInvoiceHolder: noInvoice.holder,
        bankInvoiceBank: invoice.bank,
        bankInvoiceNumber: invoice.number,
        bankInvoiceHolder: invoice.holder,
      },
      auth.session.username,
    );
    return NextResponse.json({ ok: true, bankAccounts: await getBankAccounts() });
  }

  const s = status();
  if (!s.telegram) return NextResponse.json({ error: "Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID." }, { status: 400 });
  await notifyStaff(`✅ Louis Wine: kết nối Telegram thành công (gửi thử bởi ${auth.session.username}).`, { lumia: true });
  return NextResponse.json({ ok: true, lumia: s.telegramLumia });
});
