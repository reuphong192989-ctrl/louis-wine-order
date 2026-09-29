import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { notifyStaff } from "@/lib/site/notify";

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

/** OWNER/ADMIN: which integrations are configured (no secret values are returned). */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json(status());
});

/** OWNER/ADMIN: send a Telegram test message to the restaurant (and Lumia) groups. */
export const POST = withErrors(async (_req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  const s = status();
  if (!s.telegram) return NextResponse.json({ error: "Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID." }, { status: 400 });
  await notifyStaff(`✅ Louis Wine: kết nối Telegram thành công (gửi thử bởi ${auth.session.username}).`, { lumia: true });
  return NextResponse.json({ ok: true, lumia: s.telegramLumia });
});
