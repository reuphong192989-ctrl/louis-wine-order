import { listOrders } from "@/lib/sheets/orders";
import { listReservations } from "@/lib/sheets/reservations";
import { listReviews } from "@/lib/sheets/reviews";
import { writeReportTab } from "@/lib/sheets/backend-sheets";

/**
 * Daily report into the restaurant's Google Sheet (the app's data now lives in
 * PostgreSQL; the sheet is for managers to filter, sum and export). Each run
 * rewrites three report tabs; the old data tabs (Orders, MenuItems, …) are
 * never touched.
 */
export const REPORT_TABS = { orders: "BaoCao_DonHang", reservations: "BaoCao_DatBan", reviews: "BaoCao_DanhGia" };

const DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * Force plain text for anything typed by guests or staff (and phone/table codes):
 * otherwise Sheets turns "0905…" into a number and "=…" into a live formula.
 */
const txt = (v: string | null | undefined) => (v ? `'${v}` : "");

const vnDate = (iso: string | null) => (iso ? DATE.format(new Date(iso)) : "");
const vnTime = (iso: string | null) => (iso ? TIME.format(new Date(iso)) : "");

const CHANNEL = { TABLE: "Tại bàn", PICKUP: "Mang về", DELIVERY: "Giao tận nơi", LUMIA_ROOM: "Giao phòng Lumia" } as const;
const ORDER_STATUS = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã huỷ" } as const;
const RES_STATUS = { NEW: "Mới", CONFIRMED: "Đã xác nhận", SEATED: "Đã đến", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ" } as const;

export async function exportReports(): Promise<{ orders: number; reservations: number; reviews: number }> {
  const [orders, reservations, reviews] = await Promise.all([listOrders(undefined, 1_000_000), listReservations(1_000_000), listReviews()]);

  const orderRows: (string | number)[][] = [
    [
      "Ngày",
      "Giờ",
      "Kênh",
      "Bàn / nơi nhận",
      "Mã đơn online",
      "Khách",
      "SĐT",
      "Món",
      "Số món",
      "Tạm tính",
      "Giảm giá",
      "Phí giao",
      "Tổng tiền",
      "Trạng thái",
      "Người nhận xử lý",
      "Người xác nhận",
      "Giao hàng",
      "Thanh toán",
      "Ghi chú",
    ],
    ...orders
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .map((o) => {
        const on = o.online;
        const itemsTotal = o.items.reduce((s, i) => s + i.lineTotal, 0);
        return [
          vnDate(o.createdAt),
          vnTime(o.createdAt),
          CHANNEL[on?.channel ?? "TABLE"],
          txt(o.tableId),
          txt(on?.code),
          txt(on?.customerName),
          txt(on?.phone),
          txt(o.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ")),
          o.items.reduce((s, i) => s + i.qty, 0),
          on ? on.subtotal : itemsTotal,
          on?.discount ?? 0,
          on?.shippingFee ?? 0,
          o.totalAmount,
          ORDER_STATUS[o.status] ?? o.status,
          o.claimedBy ?? "",
          o.confirmedBy ?? o.cancelledBy ?? "",
          o.fulfillment === "DELIVERED" ? `Đã giao ${vnTime(o.fulfilledAt)}` : o.fulfillment === "DELIVERING" ? "Đang giao" : "",
          o.paidAt ? (o.paymentMethod === "TRANSFER" ? "Chuyển khoản" : "Tiền mặt") : "",
          txt(o.note),
        ];
      }),
  ];

  const reservationRows: (string | number)[][] = [
    ["Ngày đặt", "Giờ", "Số khách", "Khách", "SĐT", "Khu vực", "Dịp", "Khách Lumia", "Phòng", "Xe đón", "Đã đón", "Trạng thái", "Người xử lý", "Mã", "Tạo lúc", "Ghi chú"],
    ...reservations
      .slice()
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
      .map((r) => [
        r.date,
        r.time,
        r.guests,
        txt(r.customerName),
        txt(r.phone),
        txt(r.area),
        txt(r.occasion),
        r.isLumiaGuest ? "Có" : "",
        txt(r.hotelRoom),
        r.needShuttle ? r.pickupTime ?? "" : "",
        r.shuttleDoneAt ? vnTime(r.shuttleDoneAt) : "",
        RES_STATUS[r.status] ?? r.status,
        r.handledBy ?? r.claimedBy ?? "",
        txt(r.code),
        `${vnDate(r.createdAt)} ${vnTime(r.createdAt)}`,
        txt(r.note),
      ]),
  ];

  const reviewRows: (string | number)[][] = [
    ["Ngày", "Khách", "Số sao", "Trải nghiệm", "Khách Lumia", "Hiển thị", "Nội dung"],
    ...reviews
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .map((r) => [vnDate(r.createdAt), txt(r.customerName), r.rating, txt(r.visitType), r.isLumiaGuest ? "Có" : "", r.isVisible ? "Có" : "Ẩn", txt(r.comment)]),
  ];

  await writeReportTab(REPORT_TABS.orders, orderRows);
  await writeReportTab(REPORT_TABS.reservations, reservationRows);
  await writeReportTab(REPORT_TABS.reviews, reviewRows);
  return { orders: orderRows.length - 1, reservations: reservationRows.length - 1, reviews: reviewRows.length - 1 };
}
