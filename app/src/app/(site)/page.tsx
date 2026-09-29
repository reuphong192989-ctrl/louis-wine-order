import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { ReservationForm } from "@/components/site/ReservationForm";
import { ReviewSection } from "@/components/site/ReviewSection";
import { LumiaQrWelcome } from "@/components/site/LumiaQrWelcome";
import { IconRing, InlineIcon } from "@/components/site/icons";
import { BookOpen, Bus, Car, Clock, ConciergeBell, MapPin, Phone, ShoppingBag, Star, Wine } from "lucide-react";
import { getGoogleRating } from "@/lib/sheets/settings";
import { getFeaturedItems, getReviews } from "@/lib/site/queries";
import { RESTAURANT, LUMIA, mapsEmbedUrl, siteUrl } from "@/lib/site/constants";
import { parseRoom } from "@/lib/site/lumia";
import { verifyRoomKey } from "@/lib/site/lumia-server";
import { getDict } from "@/lib/site/lang-server";
import { fmt, priceLabel } from "@/lib/site/i18n";
import { dishText } from "@/lib/site/menu-i18n";

export const dynamic = "force-dynamic";

function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <p className="text-xs uppercase tracking-[0.35em] text-gold-500">{kicker}</p>
      <h2 className="font-serif text-4xl sm:text-5xl mt-3">{title}</h2>
      <div className="divider-gold w-32 mx-auto mt-5" />
      {sub && <p className="mt-5 text-cream/65 leading-relaxed">{sub}</p>}
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { lang, t } = await getDict();
  const h = t.home;

  // Room QR codes land here (?room=302&k=…): greet the guest over the restaurant introduction.
  let qr: { floor: number; room: string; key: string } | null = null;
  let invalidQr = false;
  if (typeof sp.room === "string") {
    const parsed = parseRoom(sp.room);
    const key = typeof sp.k === "string" ? sp.k : null;
    if (parsed && key && verifyRoomKey(parsed.room, key)) qr = { ...parsed, key };
    else invalidQr = true;
  }

  const [featured, reviews, google] = await Promise.all([
    getFeaturedItems(8).catch(() => []),
    getReviews().catch(() => ({ count: 0, avg: 0, dist: [5, 4, 3, 2, 1].map((star) => ({ star, n: 0 })), list: [] })),
    getGoogleRating(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Louis Wine Đà Nẵng",
    image: `${siteUrl()}/images/hero-building.jpg`,
    logo: `${siteUrl()}/images/logo.png`,
    url: siteUrl(),
    hasMap: RESTAURANT.mapsUrl,
    telephone: RESTAURANT.hotlineRaw,
    servesCuisine: ["European", "Vietnamese", "Seafood"],
    priceRange: "$$$",
    menu: `${siteUrl()}/menu`,
    acceptsReservations: true,
    address: {
      "@type": "PostalAddress",
      streetAddress: "93 Nguyễn Đình Thi, Phường Hòa Xuân",
      addressLocality: "Đà Nẵng",
      addressCountry: "VN",
    },
    geo: { "@type": "GeoCoordinates", latitude: RESTAURANT.lat, longitude: RESTAURANT.lng },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "10:00",
      closes: "21:30",
    },
  };

  const services = [
    { icon: BookOpen, href: "/menu", ...h.services[0] },
    { icon: ShoppingBag, href: "/menu", ...h.services[1] },
    { icon: Wine, href: "#dat-ban", ...h.services[2] },
    { icon: Star, href: "#danh-gia", ...h.services[3] },
  ];
  const gallery = [
    { img: "/images/round-table.jpg", ...h.gallery[0] },
    { img: "/images/vip-room.jpg", ...h.gallery[1] },
    { img: "/images/vip-lounge.jpg", ...h.gallery[2] },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LumiaQrWelcome qr={qr} invalid={invalidQr} />
      <Header />
      <main>
        {/* HERO */}
        <section className="relative min-h-[100svh] flex items-end overflow-hidden">
          <img src="/images/hero-building.jpg" alt={h.heroAlt} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-wood-950 via-wood-950/60 to-wood-950/20" />
          <div className="relative mx-auto max-w-7xl w-full px-4 sm:px-6 pb-10 sm:pb-16 pt-28 sm:pt-40">
            <p className="text-[11px] sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.4em] text-gold-400">Restaurant · Wine Cellar · Đà Nẵng</p>
            <h1 className="font-serif text-4xl sm:text-7xl lg:text-8xl mt-4 leading-[1.05]">
              <span className="gold-text italic">Louis Wine</span>
              <br />
              <span className="text-cream">{h.heroTitle}</span>
            </h1>
            <p className="mt-4 sm:mt-6 max-w-xl text-cream/75 text-base sm:text-lg leading-relaxed">{h.heroSub}</p>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="btn-gold">
                {h.ctaMenu}
              </Link>
              <Link href="#dat-ban" className="btn-outline">
                {h.ctaBook}
              </Link>
            </div>
            <div className="mt-8 sm:mt-12 grid sm:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-gold-500/20 bg-gold-500/20 max-w-4xl">
              {[
                { icon: MapPin, k: h.addressLabel, v: t.restaurant.address, href: RESTAURANT.mapsUrl },
                { icon: Phone, k: "Hotline", v: RESTAURANT.hotline, href: `tel:${RESTAURANT.hotlineRaw}` },
                { icon: Clock, k: h.hoursLabel, v: t.restaurant.hours, href: null },
              ].map(({ icon, k, v, href }) =>
                href ? (
                  <a
                    key={k}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group bg-wood-950/85 backdrop-blur px-5 py-3 sm:py-4 hover:bg-wood-900/90 transition"
                  >
                    <p className="text-xs text-gold-400 flex items-center gap-1.5">
                      <InlineIcon icon={icon} />
                      {k}
                    </p>
                    <p className="text-sm mt-1 text-cream/85 group-hover:text-gold-300 underline decoration-gold-500/30 underline-offset-4">{v}</p>
                  </a>
                ) : (
                  <div key={k} className="bg-wood-950/85 backdrop-blur px-5 py-3 sm:py-4">
                    <p className="text-xs text-gold-400 flex items-center gap-1.5">
                      <InlineIcon icon={icon} />
                      {k}
                    </p>
                    <p className="text-sm mt-1 text-cream/85">{v}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="wood-panel py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((s) => (
              <Link
                key={s.t}
                href={s.href}
                className="group rounded-2xl border border-gold-500/20 bg-wood-900/60 p-5 sm:p-6 hover:border-gold-500/60 hover:-translate-y-1 transition"
              >
                <IconRing icon={s.icon} />
                <p className="font-serif text-xl mt-4 group-hover:text-gold-300">{s.t}</p>
                <p className="text-sm text-cream/60 mt-1">{s.d}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ABOUT + GALLERY */}
        <section id="gioi-thieu" className="py-24 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gold-500">{h.aboutKicker}</p>
                <h2 className="font-serif text-4xl sm:text-5xl mt-3 leading-tight">
                  {h.aboutTitle1} <span className="italic gold-text">{h.aboutTitle2}</span>
                </h2>
                <div className="divider-gold w-32 mt-5" />
                <p className="mt-6 text-cream/70 leading-relaxed">{h.aboutText}</p>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  {[
                    ["180+", h.stats[0]],
                    ["20+", h.stats[1]],
                    ["VIP", h.stats[2]],
                  ].map(([n, l]) => (
                    <div key={l} className="rounded-xl border border-gold-500/20 p-4 text-center">
                      <p className="font-serif text-3xl gold-text">{n}</p>
                      <p className="text-xs text-cream/60 mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <img src="/images/dining-room.jpg" alt={h.galleryAlt[0]} className="col-span-2 h-64 sm:h-80 w-full object-cover rounded-2xl" />
                <img src="/images/wine-shelf.jpg" alt={h.galleryAlt[1]} className="h-56 w-full object-cover rounded-2xl" />
                <img src="/images/party-room.jpg" alt={h.galleryAlt[2]} className="h-56 w-full object-cover rounded-2xl" />
              </div>
            </div>

            <div className="mt-16 grid sm:grid-cols-3 gap-4">
              {gallery.map((g) => (
                <div key={g.t} className="group relative overflow-hidden rounded-2xl h-72">
                  <img src={g.img} alt={g.t} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-wood-950/95 via-wood-950/20 to-transparent" />
                  <div className="absolute bottom-0 p-5">
                    <p className="font-serif text-2xl">{g.t}</p>
                    <p className="text-sm text-cream/70">{g.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED MENU */}
        <section id="thuc-don" className="wood-panel py-24 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionTitle kicker={h.menuKicker} title={h.menuTitle} sub={h.menuSub} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {featured.map((it) => {
                const tr = dishText(it.name, it.note, lang, it);
                return (
                  <article key={it.id} className="group rounded-2xl overflow-hidden border border-gold-500/15 bg-wood-900/70 flex flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {it.imageUrl && (
                        <img src={it.imageUrl} alt={tr.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                      )}
                      {it.isSpecial && (
                        <span className="absolute top-2 left-2 rounded-full bg-wine-600 px-2 py-0.5 text-[10px] uppercase tracking-wider">{h.special}</span>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="font-serif text-lg leading-snug">{tr.name}</p>
                      {tr.note && <p className="text-xs text-cream/50 mt-1 line-clamp-2">{tr.note}</p>}
                      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                        <p className="text-gold-300 font-semibold text-sm">{priceLabel(it.priceText, lang)}</p>
                        <AddToCartButton item={it} compact />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="text-center mt-12">
              <Link href="/menu" className="btn-gold">
                {h.fullMenu}
              </Link>
            </div>
          </div>
        </section>

        {/* LUMIA */}
        <section id="lumia" className="relative py-24 scroll-mt-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-wine-900 via-wood-950 to-wood-950" />
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gold-500">{h.lumiaKicker}</p>
                <h2 className="font-serif text-4xl sm:text-5xl mt-3 leading-tight">
                  {h.lumiaTitle} <span className="gold-text italic">{LUMIA.name}</span>
                </h2>
                <div className="divider-gold w-32 mt-5" />
                <p className="mt-6 text-cream/70 leading-relaxed">
                  {fmt(h.lumiaText, { floors: LUMIA.floors, rooms: LUMIA.floors * LUMIA.roomsPerFloor, km: LUMIA.distanceKm })}
                </p>
                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: ConciergeBell, title: h.roomCardTitle, lines: h.roomCard },
                    { icon: Bus, title: h.tableCardTitle, lines: h.tableCard },
                  ].map((c) => (
                    <div key={c.title} className="rounded-2xl border border-gold-500/40 bg-wood-950/70 p-6">
                      <IconRing icon={c.icon} />
                      <p className="font-serif text-2xl mt-3">{c.title}</p>
                      <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
                        {c.lines.map((l, i) => (
                          <li key={l}>
                            ✦ {i < 2 ? <b className="text-gold-300">{l}</b> : l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/lumia" className="btn-gold">
                    {h.lumiaCta}
                  </Link>
                </div>
              </div>
              <div className="relative">
                <img src="/images/lumia-apartment.jpg" alt="Lumia Apartment" className="rounded-3xl w-full h-[420px] object-cover border border-gold-500/20" />
                <div className="absolute -bottom-6 left-4 right-4 sm:left-8 sm:right-8 rounded-2xl bg-wood-950/95 border border-gold-500/30 p-5 grid grid-cols-3 gap-3 text-center">
                  {h.steps.map((s, i) => (
                    <div key={s}>
                      <p className="mx-auto grid place-items-center h-8 w-8 rounded-full bg-gold-500 text-wood-950 font-bold text-sm">{i + 1}</p>
                      <p className="text-xs mt-2 text-cream/80">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section id="danh-gia" className="wood-panel py-24 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionTitle kicker={h.reviewsKicker} title={h.reviewsTitle} sub={h.reviewsSub} />
            <ReviewSection initial={reviews} google={google} mapsUrl={RESTAURANT.mapsUrl} />
          </div>
        </section>

        {/* RESERVATION */}
        <section id="dat-ban" className="relative py-24 scroll-mt-20">
          <img src="/images/round-table.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-wood-950 via-wood-950/85 to-wood-950" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
            <SectionTitle kicker={h.bookKicker} title={h.bookTitle} sub={h.bookSub} />
            <ReservationForm />
          </div>
        </section>

        {/* CONTACT */}
        <section id="lien-he" className="py-20 scroll-mt-20 border-t border-gold-500/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 grid lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-2xl border border-gold-500/20 bg-wood-900/60 p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-gold-500">{h.contactKicker}</p>
              <h2 className="font-serif text-4xl mt-3">{h.contactTitle}</h2>
              <div className="mt-6 space-y-4 text-cream/80">
                <p className="flex items-start gap-3">
                  <InlineIcon icon={MapPin} className="mt-1" />
                  <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="hover:text-gold-300 underline-offset-4 hover:underline">
                    {t.restaurant.address}
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <InlineIcon icon={Phone} />
                  <a href={`tel:${RESTAURANT.hotlineRaw}`} className="text-gold-300 text-xl font-semibold">
                    {RESTAURANT.hotline}
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <InlineIcon icon={Clock} />
                  {t.restaurant.hours}
                </p>
                <p className="text-sm text-cream/60 pl-8">{t.restaurant.hoursNote}</p>
                <p className="flex items-center gap-3">
                  <InlineIcon icon={Car} />
                  {h.parking}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={`tel:${RESTAURANT.hotlineRaw}`} className="btn-gold">
                  {h.callNow}
                </a>
                <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="btn-outline">
                  {h.directions}
                </a>
              </div>
            </div>
            <iframe
              title={h.mapTitle}
              className="w-full min-h-80 rounded-2xl border border-gold-500/20 grayscale-[40%]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapsEmbedUrl(lang)}
            />
          </div>
        </section>
      </main>
      <Footer />

      {/* Phones: call / menu / book always within thumb reach. */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-[1fr_1fr_1.3fr] gap-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-wood-950/95 backdrop-blur border-t border-gold-500/20">
        <a href={`tel:${RESTAURANT.hotlineRaw}`} className="btn-outline px-2 py-2.5 text-sm whitespace-nowrap">
          <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {h.callNow}
        </a>
        <Link href="/menu" className="btn-outline px-2 py-2.5 text-sm whitespace-nowrap">
          {t.nav.menu}
        </Link>
        <Link href="#dat-ban" className="btn-gold px-2 py-2.5 text-sm whitespace-nowrap">
          {t.nav.book}
        </Link>
      </nav>
      <div className="h-16 md:hidden" aria-hidden />
    </>
  );
}
