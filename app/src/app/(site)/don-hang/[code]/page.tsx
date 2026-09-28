import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findOrderByCode } from "@/lib/sheets/orders";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AutoRefresh } from "@/components/site/AutoRefresh";
import { formatVnd } from "@/lib/site/pricing";
import { RESTAURANT } from "@/lib/site/constants";
import { getDict } from "@/lib/site/lang-server";
import { dishText } from "@/lib/site/menu-i18n";
import { fmt } from "@/lib/site/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };


export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [o, { lang, t }] = await Promise.all([findOrderByCode(code), getDict()]);
  const L = t.order;
  if (!o || !o.online) notFound();
  const on = o.online;

  const cancelled = o.status === "CANCELLED";
  const allDone = o.items.length > 0 && o.items.every((i) => i.kitchenStatus === "DONE");
  const cooking = o.items.some((i) => i.kitchenStatus !== "PENDING");
  const step = o.status === "PENDING" ? 0 : allDone ? 3 : cooking ? 2 : 1;

  return (
    <>
      <Header />
      <AutoRefresh />
      <main className="pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto rounded-3xl border border-gold-500/30 bg-wood-900/80 p-6 sm:p-8">
          <div className="text-center">
            <p className="text-5xl">{cancelled ? "⚠️" : "🍽"}</p>
            <h1 className="font-serif text-3xl sm:text-4xl mt-3 gold-text">{cancelled ? L.cancelled : L.thanks}</h1>
            <p className="text-cream/70 mt-2">
              {L.code}: <span className="font-mono text-gold-300 text-lg">{on.code}</span>
            </p>
          </div>

          {!cancelled && (
            <ol className="mt-8 flex justify-between gap-1">
              {L.steps.map((s, i) => (
                <li key={s} className="flex-1 text-center">
                  <div className={`mx-auto h-3 w-3 rounded-full ${i <= step ? "bg-gold-400 shadow-[0_0_12px_#c9a14a]" : "bg-cream/15"}`} />
                  <p className={`text-[11px] mt-2 ${i <= step ? "text-gold-300" : "text-cream/40"}`}>{s}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-8 rounded-2xl bg-wood-950/70 p-5 text-sm space-y-2">
            <p><span className="text-cream/50">{L.type}:</span> {L.channels[on.channel]}</p>
            <p><span className="text-cream/50">{L.customer}:</span> {on.customerName} · {on.phone}</p>
            {on.channel === "LUMIA_ROOM" && on.hotelRoom && (
              <p className="text-gold-300 font-semibold text-base">
                🛎 Lumia Apartment — {fmt(t.room.floorRoom, { floor: on.hotelRoom[0], room: on.hotelRoom })}
              </p>
            )}
            {on.channel === "DELIVERY" && <p><span className="text-cream/50">{L.address}:</span> {on.address}</p>}
            {on.scheduledTime && <p><span className="text-cream/50">{L.time}:</span> {on.scheduledTime === "Càng sớm càng tốt" ? t.cart.asap : on.scheduledTime.replace("Lúc ", "")}</p>}
            {o.note && <p><span className="text-cream/50">{L.note}:</span> {o.note}</p>}
          </div>

          <ul className="mt-6 divide-y divide-gold-500/10 text-sm">
            {o.items.map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-3">
                <span>{l.qty} × {dishText(l.nameSnapshot, null, lang).name}</span>
                <span>{formatVnd(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-cream/60">{t.cart.subtotal}</span><span>{formatVnd(on.subtotal)}</span></div>
            {on.discount > 0 && <div className="flex justify-between text-gold-300"><span>{t.cart.lumiaDiscount}</span><span>-{formatVnd(on.discount)}</span></div>}
            <div className="flex justify-between">
              <span className="text-cream/60">{t.cart.shipping}</span>
              <span>{on.channel === "LUMIA_ROOM" ? t.cart.free : formatVnd(on.shippingFee)}</span>
            </div>
            <div className="divider-gold my-2" />
            <div className="flex justify-between text-xl font-semibold"><span>{t.cart.total}</span><span className="gold-text">{formatVnd(o.totalAmount)}</span></div>
          </div>

          <p className="mt-6 text-center text-sm text-cream/60">
            {L.help}{" "}
            <a className="text-gold-300" href={`tel:${RESTAURANT.hotlineRaw}`}>{RESTAURANT.hotline}</a>
          </p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link href="/menu" className="btn-outline">{L.more}</Link>
            <Link href="/#danh-gia" className="btn-gold">{L.review}</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
