import { after, NextResponse } from "next/server";
import { langFromRequest } from "@/lib/site/lang-server";
import { dict } from "@/lib/site/i18n";
import { createReview, listReviews, reviewSummary } from "@/lib/sheets/reviews";
import { getSession } from "@/lib/auth";
import { cleanText } from "@/lib/site/validate";
import { rateLimit, tooMany } from "@/lib/site/rate-limit";
import { notifyStaff, reviewMessage } from "@/lib/site/notify";

export const dynamic = "force-dynamic";

const VISIT_TYPES =["Ăn tại nhà hàng", "Đặt mang về", "Giao về phòng Lumia", "Tiệc / sự kiện"];

/** Public summary of visible reviews; `?all=1` returns every review for admins. */
export async function GET(req: Request) {
  try {
    if (new URL(req.url).searchParams.get("all") === "1") {
      const s = await getSession();
      if (!s || (s.role !== "OWNER" && s.role !== "ADMIN")) {
        return NextResponse.json({ error: "Bạn không có quyền xem mục này." }, { status: 403 });
      }
      return NextResponse.json({ reviews: await listReviews() });
    }
    return NextResponse.json(await reviewSummary());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const msg = dict(langFromRequest(req)).errors;
  if (!rateLimit(req, "reviews", 3, 30 * 60 * 1000)) return tooMany(msg.tooMany);
  try {
    const b = await req.json().catch(() => null);
    if (!b) return bad(msg.invalid);
    const customerName = cleanText(b.customerName, 60);
    if (!customerName) return bad(msg.reviewName);
    const rating = Math.floor(Number(b.rating));
    if (!(rating >= 1 && rating <= 5)) return bad(msg.stars);
    const comment = cleanText(b.comment, 1000);
    if (!comment || comment.length < 5) return bad(msg.comment);
    const visitType = VISIT_TYPES.includes(b.visitType) ? (b.visitType as string) : null;

    await createReview({ customerName, rating, comment, visitType, isLumiaGuest: !!b.isLumiaGuest });
    after(() => notifyStaff(reviewMessage({ customerName, rating, comment, visitType })));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: msg.server }, { status: 500 });
  }
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
