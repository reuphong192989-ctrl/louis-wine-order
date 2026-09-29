import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { requireSession } from "@/lib/api-auth";
import { notifyStaff } from "@/lib/site/notify";
import { fetchGooglePlace, searchPlaces } from "@/lib/site/google-reviews";

export const dynamic = "force-dynamic";

function status() {
  return {
    sheets: !!(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    cron: !!process.env.CRON_SECRET,
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    telegramLumia: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_LUMIA_CHAT_ID),
    qrSecret: !!process.env.LUMIA_QR_SECRET,
    googleKey: !!process.env.GOOGLE_PLACES_API_KEY,
    googlePlace: !!(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACE_ID),
  };
}

/** OWNER/ADMIN: which integrations are configured (no secret values are returned). */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json(status());
});

/**
 * OWNER/ADMIN tests:
 * - {} or { action: "telegram" }: Telegram test message to the restaurant (and Lumia) groups
 * - { action: "google" }: fetch the live Google rating for GOOGLE_PLACE_ID
 * - { action: "google-search", query }: find the restaurant's Place ID by name
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireSession(["OWNER", "ADMIN"]);
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { action?: string; query?: string };
  const s = status();

  if (body.action === "google") {
    if (!s.googlePlace) return NextResponse.json({ error: "Chưa cấu hình GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID." }, { status: 400 });
    try {
      const p = await fetchGooglePlace("vi", true);
      return NextResponse.json({ ok: true, rating: p?.rating ?? 0, count: p?.count ?? 0, reviews: p?.reviews.length ?? 0 });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  if (body.action === "google-search") {
    if (!s.googleKey) return NextResponse.json({ error: "Chưa cấu hình GOOGLE_PLACES_API_KEY." }, { status: 400 });
    const query = (body.query ?? "").trim().slice(0, 120) || "Louis Wine Đà Nẵng";
    try {
      return NextResponse.json({ ok: true, places: await searchPlaces(query) });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  if (!s.telegram) return NextResponse.json({ error: "Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID." }, { status: 400 });
  await notifyStaff(`✅ Louis Wine: kết nối Telegram thành công (gửi thử bởi ${auth.session.username}).`, { lumia: true });
  return NextResponse.json({ ok: true, lumia: s.telegramLumia });
});
