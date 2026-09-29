import type { Order } from "@/lib/sheets/orders";
import type { Reservation } from "@/lib/sheets/reservations";
import { CHANNEL_LABEL, siteUrl } from "./constants";
import { formatVnd } from "./pricing";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sends a message to a staff Telegram group. Optional: does nothing unless
 * TELEGRAM_BOT_TOKEN and the chat id are set. Never throws.
 * `lumia: true` also copies it to the Lumia reception group (TELEGRAM_LUMIA_CHAT_ID) when set.
 */
export async function notifyStaff(html: string, opts: { lumia?: boolean } = {}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const chats = [process.env.TELEGRAM_CHAT_ID, opts.lumia ? process.env.TELEGRAM_LUMIA_CHAT_ID : undefined].filter(
    (c): c is string => !!c,
  );
  await Promise.all(
    chats.map((chatId) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      }).catch((e) => console.error("notifyStaff failed", e)),
    ),
  );
}

export function orderMessage(o: Order) {
  const on = o.online!;
  const lines = o.items.map((l) => `  • ${l.qty} × ${esc(l.nameSnapshot)}`).join("\n");
  return [
    `🛎 <b>ĐƠN ONLINE ${on.code}</b> — ${CHANNEL_LABEL[on.channel] ?? on.channel}`,
    `👤 ${esc(on.customerName)} · ${on.phone}`,
    on.address ? `📍 ${esc(on.address)}${on.channel === "LUMIA_ROOM" ? (on.roomVerified ? " ✅ QR" : " ⚠️ nhập tay – gọi xác minh") : ""}` : "",
    on.scheduledTime ? `⏰ ${esc(on.scheduledTime)}` : "",
    lines,
    o.note ? `📝 ${esc(o.note)}` : "",
    `💰 <b>${formatVnd(o.totalAmount)}</b>`,
    `${siteUrl()}/staff`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** QR table / tablet order — backup alert for when no staff screen is open. */
export function tableOrderMessage(o: Order) {
  const NL = String.fromCharCode(10);
  const lines = o.items.map((l) => `  • ${l.qty} × ${esc(l.nameSnapshot)}${l.note ? ` (${esc(l.note)})` : ""}`).join(NL);
  return [`🍽 <b>ĐƠN TẠI BÀN ${esc(o.tableId)}</b>`, lines, `💰 <b>${formatVnd(o.totalAmount)}</b>`, `${siteUrl()}/staff`].join(NL);
}

export function reservationMessage(r: Reservation) {
  return [
    `🍷 <b>ĐẶT BÀN ${r.code}</b>`,
    `📅 ${r.time} · ${r.date.split("-").reverse().join("/")} · ${r.guests} khách`,
    `👤 ${esc(r.customerName)} · ${r.phone}`,
    r.area ? `🪑 ${esc(r.area)}` : "",
    r.occasion ? `🎉 ${esc(r.occasion)}` : "",
    r.isLumiaGuest ? `🏨 Lumia phòng ${r.hotelRoom}${r.roomVerified ? " ✅ QR" : " ⚠️ cần xác minh"} · -10%` : "",
    r.needShuttle ? `🚐 Xe đón tại sảnh Lumia lúc <b>${r.pickupTime}</b>` : "",
    r.note ? `📝 ${esc(r.note)}` : "",
    `${siteUrl()}/admin/reservations`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function reviewMessage(r: { customerName: string; rating: number; comment: string; visitType: string | null }) {
  return [
    `${r.rating <= 3 ? "⚠️" : "⭐"} <b>ĐÁNH GIÁ ${r.rating}★</b> — ${esc(r.customerName)}${r.visitType ? ` · ${esc(r.visitType)}` : ""}`,
    esc(r.comment),
  ].join("\n");
}
