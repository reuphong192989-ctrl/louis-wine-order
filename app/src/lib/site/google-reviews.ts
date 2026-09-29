import type { Lang } from "./i18n";

/**
 * Real rating and recent reviews of the restaurant's Google Maps listing
 * (Places API, New). Optional: needs GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID;
 * without them, or if Google fails, the site just links to Google Maps.
 */
export type GoogleReview = {
  author: string;
  authorUri: string | null;
  photoUri: string | null;
  rating: number;
  text: string;
  when: string;
};

export type GooglePlace = {
  rating: number;
  count: number;
  reviewsUri: string;
  writeReviewUri: string;
  reviews: GoogleReview[];
};

// Refresh at most every 6 hours per language (~360 calls a month), well inside Google's free monthly usage.
const REVALIDATE_S = 6 * 60 * 60;

export function googlePlacesConfigured() {
  return !!(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACE_ID);
}

type PlaceResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

export async function fetchGooglePlace(lang: Lang, fresh = false): Promise<GooglePlace | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews" },
    signal: AbortSignal.timeout(5000),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: REVALIDATE_S } }),
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const p = (await res.json()) as PlaceResponse;
  const q = encodeURIComponent(placeId);
  return {
    rating: p.rating ?? 0,
    count: p.userRatingCount ?? 0,
    reviewsUri: `https://search.google.com/local/reviews?placeid=${q}`,
    writeReviewUri: `https://search.google.com/local/writereview?placeid=${q}`,
    reviews: (p.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? "Google",
        authorUri: r.authorAttribution?.uri ?? null,
        photoUri: r.authorAttribution?.photoUri ?? null,
        rating: r.rating ?? 0,
        text: r.text?.text ?? r.originalText?.text ?? "",
        when: r.relativePublishTimeDescription ?? "",
      }))
      .filter((r) => r.text),
  };
}

/** For the public page: never throws. */
export async function getGooglePlace(lang: Lang): Promise<GooglePlace | null> {
  try {
    return await fetchGooglePlace(lang);
  } catch (e) {
    console.error("getGooglePlace failed", e);
    return null;
  }
}

/** Admin helper: find the restaurant's Place ID by name (needs only the API key). */
export async function searchPlaces(query: string): Promise<{ id: string; name: string; address: string; rating: number | null; count: number | null }[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("Chưa cấu hình GOOGLE_PLACES_API_KEY.");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "vi",
      locationBias: { circle: { center: { latitude: 16.018327, longitude: 108.2354253 }, radius: 5000 } },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const d = (await res.json()) as {
    places?: { id: string; displayName?: { text?: string }; formattedAddress?: string; rating?: number; userRatingCount?: number }[];
  };
  return (d.places ?? []).slice(0, 5).map((p) => ({
    id: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    rating: p.rating ?? null,
    count: p.userRatingCount ?? null,
  }));
}
