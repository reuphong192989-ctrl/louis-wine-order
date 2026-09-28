import { after, NextResponse } from "next/server";
import { createReservation, listReservations } from "@/lib/sheets/reservations";
import { requireSession } from "@/lib/api-auth";
import { withErrors } from "@/lib/api-handler";
import { isValidRoom } from "@/lib/site/lumia";
import { verifyRoomKey } from "@/lib/site/lumia-server";
import { cleanPhone, cleanText, genCode, nowTimeVN, todayVN } from "@/lib/site/validate";
import { rateLimit, tooMany } from "@/lib/site/rate-limit";
import { notifyStaff, reservationMessage } from "@/lib/site/notify";

export const dynamic = "force-dynamic";

/** Staff / admin: list reservations (most recent first). */
export const GET = withErrors(async () => {
  const auth = await requireSession(["OWNER", "ADMIN", "STAFF"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ reservations: await listReservations() });
});

/** Public: book a table from the website. */
export async function POST(req: Request) {
  if (!rateLimit(req, "reservations", 5, 10 * 60 * 1000)) return tooMany();
  try {
    const b = await req.json().catch(() => null);
    if (!b || typeof b !== "object") return bad("Dữ liệu không hợp lệ.");

    const customerName = cleanText(b.customerName, 80);
    if (!customerName) return bad("Vui lòng nhập họ tên.");
    const phone = cleanPhone(b.phone);
    if (!phone) return bad("Số điện thoại không hợp lệ.");

    const date = String(b.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Vui lòng chọn ngày.");
    if (date < todayVN()) return bad("Ngày đặt bàn không được ở quá khứ.");
    const time = String(b.time ?? "");
    if (!/^\d{2}:\d{2}$/.test(time)) return bad("Vui lòng chọn giờ.");
    if (date === todayVN() && time <= nowTimeVN()) return bad("Giờ đặt bàn hôm nay đã qua, vui lòng chọn giờ khác.");
    const guests = Math.floor(Number(b.guests));
    if (!Number.isInteger(guests) || guests < 1 || guests > 100) return bad("Số khách không hợp lệ.");

    const isLumiaGuest = !!b.isLumiaGuest;
    let hotelRoom: string | null = null;
    let roomVerified = false;
    let needShuttle = false;
    let pickupTime: string | null = null;

    if (isLumiaGuest) {
      const floor = Number(b.floor);
      const room = String(b.room ?? "");
      if (!isValidRoom(floor, room)) return bad("Số tầng / số phòng Lumia Apartment không hợp lệ.");
      hotelRoom = room;
      roomVerified = verifyRoomKey(room, b.lumiaKey);
      needShuttle = !!b.needShuttle;
      if (needShuttle) {
        pickupTime = String(b.pickupTime ?? "");
        if (!/^\d{2}:\d{2}$/.test(pickupTime)) return bad("Vui lòng chọn giờ xe đón.");
      }
    }

    const r = await createReservation({
      code: genCode("BK"),
      customerName,
      phone,
      date,
      time,
      guests,
      area: cleanText(b.area, 60),
      occasion: cleanText(b.occasion, 60),
      isLumiaGuest,
      hotelRoom,
      roomVerified,
      needShuttle,
      pickupTime,
      note: cleanText(b.note, 500),
    });
    after(() => notifyStaff(reservationMessage(r), { lumia: isLumiaGuest }));
    return Response.json({ ok: true, code: r.code });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: "Lỗi máy chủ, vui lòng thử lại." }, { status: 500 });
  }
}

function bad(error: string) {
  return Response.json({ ok: false, error }, { status: 400 });
}
