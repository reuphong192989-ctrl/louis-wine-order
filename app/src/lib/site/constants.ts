export const RESTAURANT = {
  name: "Louis Wine",
  city: "Đà Nẵng",
  hotline: "0789 94 93 93",
  hotlineRaw: "0789949393",
  address: "93 Nguyễn Đình Thi, Phường Hòa Xuân, TP. Đà Nẵng",
  hours: "10:00 – 23:00 hằng ngày",
  mapQuery: "93 Nguyễn Đình Thi, Hòa Xuân, Đà Nẵng",
};

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
