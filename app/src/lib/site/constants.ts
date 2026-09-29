export const RESTAURANT = {
  name: "Louis Wine",
  city: "Đà Nẵng",
  hotline: "0789 94 93 93",
  hotlineRaw: "0789949393",
  address: "93 Nguyễn Đình Thi, Phường Hòa Xuân, TP. Đà Nẵng",
  hours: "10:00 – 21:30 hằng ngày",
  // Kitchen hours (VN time). Guests seated before closing may stay on; no new food orders after it.
  kitchenOpen: "10:00",
  kitchenClose: "21:30",
  // Latest table booking slot, so guests can still order before the kitchen closes.
  lastBooking: "21:00",
  // Google Maps place "Louis Wine Đà Nẵng" (the street address alone shows the old "Hầm rượu Bảo Nam" listing).
  mapsUrl: "https://maps.app.goo.gl/oPEgTdq4zQPuv789A",
  lat: 16.018327,
  lng: 108.2354253,
};

// Google place id of "Louis Wine Đà Nẵng" (from the share link above).
const PLACE_ID = "0x31421987dc6e9127:0xf7cb90b96a6a9555";

/** Embedded map showing the restaurant's own place card (Google "Share → Embed a map" format). */
export function mapsEmbedUrl(lang: string): string {
  const { lat, lng } = RESTAURANT;
  return (
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1200!2d" +
    `${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s${encodeURIComponent(PLACE_ID)}` +
    `!2s${encodeURIComponent("Louis Wine Đà Nẵng")}!5e0!3m2!1s${lang}!2s!4v1`
  );
}

/** Public base URL (no trailing slash), used for SEO, sitemap and QR links. */
export function siteUrl(): string {
  return (process.env.PUBLIC_SITE_URL || "https://louis-wine-order.vercel.app").replace(/\/$/, "");
}

export const LUMIA = {
  name: "Lumia Apartment",
  floors: 5,
  roomsPerFloor: 6,
  distanceKm: 5,
  discountRate: 0.1,
};

export const DELIVERY_FEE = 30000;

export const CHANNEL_LABEL: Record<string, string> = {
  TABLE: "Tại bàn",
  PICKUP: "Khách đến lấy",
  DELIVERY: "Giao tận nơi",
  LUMIA_ROOM: "Giao về phòng Lumia",
};

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  NEW: "Mới",
  CONFIRMED: "Đã xác nhận",
  SEATED: "Đã đến",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
};
