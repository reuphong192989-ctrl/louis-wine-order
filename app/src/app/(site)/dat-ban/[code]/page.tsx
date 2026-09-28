import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findReservationByCode } from "@/lib/sheets/reservations";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AutoRefresh } from "@/components/site/AutoRefresh";
import { RESTAURANT } from "@/lib/site/constants";
import { getDict } from "@/lib/site/lang-server";
import { fmt } from "@/lib/site/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReservationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [r, { t }] = await Promise.all([findReservationByCode(code), getDict()]);
  const R = t.reservation;
  if (!r) notFound();

  return (
    <>
      <Header />
      <AutoRefresh />
      <main className="pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-xl mx-auto rounded-3xl border border-gold-500/30 bg-wood-900/80 p-6 sm:p-8 text-center">
          <p className="text-5xl">🍷</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-3 gold-text">{R.title}</h1>
          <p className="text-cream/70 mt-2">
            {R.code}: <span className="font-mono text-gold-300 text-lg">{r.code}</span>
          </p>
          <span
            className={`mt-4 inline-block rounded-full px-4 py-1 text-sm ${
              r.status === "CANCELLED" ? "bg-wine-700" : r.status === "NEW" ? "bg-cream/10" : "bg-gold-500 text-wood-950 font-semibold"
            }`}
          >
            {R.statuses[r.status] ?? r.status}
          </span>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              [R.date, r.date.split("-").reverse().join("/")],
              [R.time, r.time],
              [R.guests, String(r.guests)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-wood-950/70 p-3">
                <p className="text-xs text-cream/50">{k}</p>
                <p className="font-serif text-xl mt-1">{v}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-wood-950/70 p-5 text-sm text-left space-y-2">
            <p><span className="text-cream/50">{R.customer}:</span> {r.customerName} · {r.phone}</p>
            {r.area && <p><span className="text-cream/50">{R.area}:</span> {r.area}</p>}
            {r.occasion && <p><span className="text-cream/50">{R.occasion}:</span> {r.occasion}</p>}
            {r.note && <p><span className="text-cream/50">{R.note}:</span> {r.note}</p>}
          </div>

          {r.isLumiaGuest && (
            <div className="mt-6 rounded-2xl border border-gold-500/50 bg-gold-500/10 p-5 text-left">
              <p className="text-gold-300 font-semibold">{fmt(R.lumia, { room: r.hotelRoom ?? "" })}</p>
              <p className="text-sm mt-2">{R.discount}</p>
              {r.needShuttle && (
                <p className="text-sm">{fmt(R.shuttle, { time: r.pickupTime ?? "" })}</p>
              )}
            </div>
          )}

          <p className="mt-6 text-sm text-cream/60">
            {R.change} <a className="text-gold-300" href={`tel:${RESTAURANT.hotlineRaw}`}>{RESTAURANT.hotline}</a>
          </p>
          <Link href="/menu" className="btn-outline mt-6">{R.menu}</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
