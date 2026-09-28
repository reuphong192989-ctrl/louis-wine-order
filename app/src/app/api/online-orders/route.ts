import { after } from "next/server";
import { createOrder, type OnlineOrderInfo } from "@/lib/sheets/orders";
import { findMenuItemsByIds } from "@/lib/sheets/menuItems";
import { computeTotals, type OnlineChannel } from "@/lib/site/pricing";
import { isValidRoom } from "@/lib/site/lumia";
import { verifyRoomKey } from "@/lib/site/lumia-server";
import { cleanPhone, cleanText, genCode } from "@/lib/site/validate";
import { rateLimit, tooMany } from "@/lib/site/rate-limit";
import { notifyStaff, orderMessage } from "@/lib/site/notify";

export const dynamic = "force-dynamic";

const CHANNELS: OnlineChannel[] = ["PICKUP", "DELIVERY", "LUMIA_ROOM"];

/**
 * Website orders (pickup / delivery / Lumia room). Saved into the same Orders
 * table as QR table orders, so they appear on the staff and kitchen screens.
 */
export async function POST(req: Request) {
  if (!rateLimit(req, "online-orders", 5, 10 * 60 * 1000)) return tooMany();
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return bad("Dữ liệu không hợp lệ.");

    const channel = body.channel as OnlineChannel;
    if (!CHANNELS.includes(channel)) return bad("Vui lòng chọn hình thức nhận món.");

    const customerName = cleanText(body.customerName, 80);
    if (!customerName) return bad("Vui lòng nhập họ tên.");
    const phone = cleanPhone(body.phone);
    if (!phone) return bad("Số điện thoại không hợp lệ.");

    let address: string | null = null;
    let hotelRoom: string | null = null;
    let roomVerified = false;

    if (channel === "DELIVERY") {
      address = cleanText(body.address, 300);
      if (!address) return bad("Vui lòng nhập địa chỉ giao hàng.");
    }
    if (channel === "LUMIA_ROOM") {
      const floor = Number(body.floor);
      const room = String(body.room ?? "");
      if (!isValidRoom(floor, room)) {
        return bad("Số tầng / số phòng Lumia Apartment không hợp lệ. Vui lòng kiểm tra lại.");
      }
      hotelRoom = room;
      roomVerified = verifyRoomKey(room, body.lumiaKey);
      address = `Lumia Apartment — Tầng ${floor}, Phòng ${room}`;
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const wanted = new Map<string, number>();
    for (const it of rawItems) {
      const id = typeof it?.itemId === "string" ? it.itemId : "";
      const qty = Math.floor(Number(it?.qty));
      if (id && qty > 0) wanted.set(id, Math.min(99, (wanted.get(id) ?? 0) + qty));
    }
    if (!wanted.size) return bad("Giỏ hàng đang trống.");

    // Prices always come from the database, never from the browser.
    const byId = await findMenuItemsByIds([...wanted.keys()]);
    const lines = [];
    for (const [id, qty] of wanted) {
      const item = byId.get(id);
      if (!item || !item.available || item.priceValue == null) continue;
      lines.push({ menuItemId: item.id, nameSnapshot: item.name, unitPrice: item.priceValue, qty, lineTotal: item.priceValue * qty, note: null });
    }
    if (!lines.length) return bad("Các món đã chọn hiện không thể đặt online.");

    const totals = computeTotals(
      lines.reduce((s, l) => s + l.lineTotal, 0),
      channel,
    );
    const online: OnlineOrderInfo = {
      channel,
      code: genCode("LW"),
      customerName,
      phone,
      address,
      hotelRoom,
      roomVerified,
      scheduledTime: cleanText(body.scheduledTime, 40),
      subtotal: totals.subtotal,
      discount: totals.discount,
      shippingFee: totals.shippingFee,
    };
    // tableId is what the staff/kitchen screens print as the order's heading.
    const tableId = channel === "LUMIA_ROOM" ? `Lumia ${hotelRoom}` : channel === "DELIVERY" ? "Giao tận nơi" : "Mang về";

    const order = await createOrder({ tableId, lines, online, note: cleanText(body.note, 500) });
    after(() => notifyStaff(orderMessage(order), { lumia: channel === "LUMIA_ROOM" }));
    return Response.json({ ok: true, code: online.code });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: "Lỗi máy chủ, vui lòng thử lại." }, { status: 500 });
  }
}

function bad(error: string) {
  return Response.json({ ok: false, error }, { status: 400 });
}
