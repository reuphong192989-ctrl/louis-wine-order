import { after } from "next/server";
import { langFromRequest } from "@/lib/site/lang-server";
import { dict } from "@/lib/site/i18n";
import { createOrder, type OnlineOrderInfo } from "@/lib/sheets/orders";
import { findMenuItemsByIds } from "@/lib/sheets/menuItems";
import { computeTotals, type OnlineChannel } from "@/lib/site/pricing";
import { isValidRoom } from "@/lib/site/lumia";
import { verifyRoomKey } from "@/lib/site/lumia-server";
import { cleanPhone, cleanText, genCode, nowTimeVN } from "@/lib/site/validate";
import { RESTAURANT } from "@/lib/site/constants";
import { rateLimit, tooMany } from "@/lib/site/rate-limit";
import { notifyStaff, orderMessage } from "@/lib/site/notify";

export const dynamic = "force-dynamic";

const CHANNELS: OnlineChannel[] = ["PICKUP", "DELIVERY", "LUMIA_ROOM"];

/**
 * Website orders (pickup / delivery / Lumia room). Saved into the same Orders
 * table as QR table orders, so they appear on the staff and kitchen screens.
 */
export async function POST(req: Request) {
  const msg = dict(langFromRequest(req)).errors;
  if (!rateLimit(req, "online-orders", 5, 10 * 60 * 1000)) return tooMany(msg.tooMany);
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return bad(msg.invalid);

    const channel = body.channel as OnlineChannel;
    if (!CHANNELS.includes(channel)) return bad(msg.channel);

    // Kitchen 10:00–21:30: after closing no online orders; before opening only scheduled ones ("Lúc 11:00").
    const now = nowTimeVN();
    const scheduled = typeof body.scheduledTime === "string" && body.scheduledTime.startsWith("Lúc ");
    if (now >= RESTAURANT.kitchenClose || (now < RESTAURANT.kitchenOpen && !scheduled)) return bad(msg.kitchenClosed);

    const customerName = cleanText(body.customerName, 80);
    if (!customerName) return bad(msg.name);
    const phone = cleanPhone(body.phone);
    if (!phone) return bad(msg.phone);

    let address: string | null = null;
    let hotelRoom: string | null = null;
    let roomVerified = false;

    if (channel === "DELIVERY") {
      address = cleanText(body.address, 300);
      if (!address) return bad(msg.address);
    }
    if (channel === "LUMIA_ROOM") {
      const floor = Number(body.floor);
      const room = String(body.room ?? "");
      if (!isValidRoom(floor, room)) {
        return bad(msg.room);
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
    if (!wanted.size) return bad(msg.empty);

    // Prices always come from the database, never from the browser.
    const byId = await findMenuItemsByIds([...wanted.keys()]);
    const lines = [];
    for (const [id, qty] of wanted) {
      const item = byId.get(id);
      if (!item || !item.available || item.priceValue == null) continue;
      lines.push({ menuItemId: item.id, nameSnapshot: item.name, unitPrice: item.priceValue, qty, lineTotal: item.priceValue * qty, note: null });
    }
    if (!lines.length) return bad(msg.unavailable);

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
    return Response.json({ ok: false, error: msg.server }, { status: 500 });
  }
}

function bad(error: string) {
  return Response.json({ ok: false, error }, { status: 400 });
}
