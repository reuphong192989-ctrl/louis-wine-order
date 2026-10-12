import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-handler";
import { getGoogleRating } from "@/lib/sheets/settings";
import { RESTAURANT } from "@/lib/site/constants";

export const dynamic = "force-dynamic";

/** Public — where "Đánh giá trên Google" points (the manager's review link, else the Maps listing). */
export const GET = withErrors(async () => {
  const g = await getGoogleRating();
  return NextResponse.json({ url: g.reviewUrl || RESTAURANT.mapsUrl, rating: g.rating });
});
