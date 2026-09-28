import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { ReservationForm } from "@/components/site/ReservationForm";
import { ReviewSection } from "@/components/site/ReviewSection";
import { getFeaturedItems, getReviews } from "@/lib/site/queries";
import { RESTAURANT, LUMIA, siteUrl } from "@/lib/site/constants";

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

export default async function Home() {
  const [featured, reviews] = await Promise.all([
    getFeaturedItems(8).catch(() => []),
    getReviews().catch(() => ({ count: 0, avg: 0, dist: [5, 4, 3, 2, 1].map((star) => ({ star, n: 0 })), list: [] })),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Louis Wine Đà Nẵng",
    image: `${siteUrl()}/images/hero-building.jpg`,
    logo: `${siteUrl()}/images/logo.png`,
    url: siteUrl(),
    telephone: RESTAURANT.hotlineRaw,
    servesCuisine: ["Âu", "Việt Nam", "Hải sản"],
    priceRange: "$$$",
    menu: `${siteUrl()}/menu`,
    acceptsReservations: true,
    address: {
      "@type": "PostalAddress",
      streetAddress: "93 Nguyễn Đình Thi, Phường Hòa Xuân",
      addressLocality: "Đà Nẵng",
      addressCountry: "VN",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "10:00",
      closes: "23:00",
    },
    ...(reviews.count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.avg.toFixed(1), reviewCount: reviews.count },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Header />
      <main>
        {/* HERO */}
        <section className="relative min-h-[100svh] flex items-end overflow-hidden">
          <img src="/images/hero-building.jpg" alt="Louis Wine Đà Nẵng về đêm" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-wood-950 via-wood-950/60 to-wood-950/20" />
          <div className="relative mx-auto max-w-7xl w-full px-4 sm:px-6 pb-16 pt-40">
            <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-gold-400">Restaurant · Wine Cellar · Đà Nẵng</p>
            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl mt-4 leading-[1.05]">
              <span className="gold-text italic">Louis Wine</span>
              <br />
              <span className="text-cream">Hương vang & tinh hoa ẩm thực</span>
            </h1>
            <p className="mt-6 max-w-xl text-cream/75 text-lg leading-relaxed">
              Hầm rượu vang nhập khẩu, món Âu – Việt tinh tế cùng hải sản tươi sống, trong không gian gỗ cổ điển ấm cúng.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="btn-gold">Xem thực đơn & đặt món</Link>
              <Link href="#dat-ban" className="btn-outline">Đặt bàn trước</Link>
            </div>
            <div className="mt-12 grid sm:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-gold-500/20 bg-gold-500/20 max-w-4xl">
              {[
                ["📍 Địa chỉ", RESTAURANT.address],
                ["☎ Hotline", RESTAURANT.hotline],
                ["🕰 Giờ mở cửa", RESTAURANT.hours],
              ].map(([k, v]) => (
                <div key={k} className="bg-wood-950/85 backdrop-blur px-5 py-4">
                  <p className="text-xs text-gold-400">{k}</p>
                  <p className="text-sm mt-1 text-cream/85">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="wood-panel py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "📖", t: "Xem thực đơn", d: "180+ món Âu, Việt, hải sản & vang", href: "/menu" },
              { icon: "🛍", t: "Đặt món mang về", d: "Tự đến lấy hoặc giao tận nơi", href: "/menu" },
              { icon: "🍷", t: "Đặt bàn trước", d: "Sảnh chính, phòng VIP, hầm rượu", href: "#dat-ban" },
              { icon: "⭐", t: "Đánh giá", d: "Chia sẻ trải nghiệm của bạn", href: "#danh-gia" },
            ].map((s) => (
              <Link
                key={s.t}
                href={s.href}
                className="group rounded-2xl border border-gold-500/20 bg-wood-900/60 p-5 sm:p-6 hover:border-gold-500/60 hover:-translate-y-1 transition"
              >
                <span className="text-3xl">{s.icon}</span>
                <p className="font-serif text-xl mt-3 group-hover:text-gold-300">{s.t}</p>
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
                <p className="text-xs uppercase tracking-[0.35em] text-gold-500">Về chúng tôi</p>
                <h2 className="font-serif text-4xl sm:text-5xl mt-3 leading-tight">
                  Một hầm rượu cổ điển <span className="italic gold-text">giữa lòng Đà Nẵng</span>
                </h2>
                <div className="divider-gold w-32 mt-5" />
                <p className="mt-6 text-cream/70 leading-relaxed">
                  Toà nhà gạch đỏ Louis Wine trên đường Nguyễn Đình Thi là điểm hẹn của những người yêu vang và ẩm thực. Bên
                  trong là những phòng tiệc ốp gỗ, đèn thùng rượu, những kệ vang từ Ý, Tây Ban Nha, Chile, Pháp — và căn bếp
                  phục vụ từ bò Fuji, Tomahawk dát vàng đến cua, tôm hùm, cá bơn tươi sống.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  {[
                    ["180+", "Món ăn"],
                    ["20+", "Nhãn vang"],
                    ["VIP", "Phòng riêng"],
                  ].map(([n, l]) => (
                    <div key={l} className="rounded-xl border border-gold-500/20 p-4 text-center">
                      <p className="font-serif text-3xl gold-text">{n}</p>
                      <p className="text-xs text-cream/60 mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <img src="/images/dining-room.jpg" alt="Phòng tiệc hầm rượu" className="col-span-2 h-64 sm:h-80 w-full object-cover rounded-2xl" />
                <img src="/images/wine-shelf.jpg" alt="Tủ rượu gỗ" className="h-56 w-full object-cover rounded-2xl" />
                <img src="/images/party-room.jpg" alt="Phòng tiệc bàn dài" className="h-56 w-full object-cover rounded-2xl" />
              </div>
            </div>

            <div className="mt-16 grid sm:grid-cols-3 gap-4">
              {[
                { img: "/images/round-table.jpg", t: "Bàn tròn hầm rượu", d: "Bàn kính trưng vang, 8–10 khách" },
                { img: "/images/vip-room.jpg", t: "Phòng VIP riêng", d: "Tiếp khách, tiệc gia đình 12–16 khách" },
                { img: "/images/vip-lounge.jpg", t: "Lounge sofa", d: "Thưởng vang, cigar sau bữa tối" },
              ].map((g) => (
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
            <SectionTitle kicker="Thực đơn" title="Món đặc sắc của Louis" sub="Những món được thực khách yêu thích nhất — đặt ngay để mang về hoặc giao tận nơi." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {featured.map((it) => (
                <article key={it.id} className="group rounded-2xl overflow-hidden border border-gold-500/15 bg-wood-900/70 flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {it.imageUrl && (
                      <img src={it.imageUrl} alt={it.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                    )}
                    {it.isSpecial && (
                      <span className="absolute top-2 left-2 rounded-full bg-wine-600 px-2 py-0.5 text-[10px] uppercase tracking-wider">Đặc biệt</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="font-serif text-lg leading-snug">{it.name}</p>
                    {it.note && <p className="text-xs text-cream/50 mt-1 line-clamp-2">{it.note}</p>}
                    <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                      <p className="text-gold-300 font-semibold text-sm">{it.priceText}</p>
                      <AddToCartButton item={it} compact />
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/menu" className="btn-gold">Xem toàn bộ thực đơn →</Link>
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
                <p className="text-xs uppercase tracking-[0.35em] text-gold-500">Đặc quyền lưu trú</p>
                <h2 className="font-serif text-4xl sm:text-5xl mt-3 leading-tight">
                  Ưu đãi riêng cho khách <span className="gold-text italic">{LUMIA.name}</span>
                </h2>
                <div className="divider-gold w-32 mt-5" />
                <p className="mt-6 text-cream/70 leading-relaxed">
                  Lumia Apartment ({LUMIA.floors} tầng · {LUMIA.floors * LUMIA.roomsPerFloor} phòng) cách Louis Wine chỉ{" "}
                  {LUMIA.distanceKm}km. Mỗi phòng đều có mã QR riêng — quét mã là số tầng, số phòng được điền sẵn chính xác
                  để nhân viên phục vụ tận nơi.
                </p>
                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gold-500/40 bg-wood-950/70 p-6">
                    <p className="text-3xl">🛎</p>
                    <p className="font-serif text-2xl mt-2">Order về phòng</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
                      <li>✦ <b className="text-gold-300">Giảm 10%</b> tổng hoá đơn</li>
                      <li>✦ <b className="text-gold-300">Miễn phí giao hàng</b></li>
                      <li>✦ Giao tận cửa phòng</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-gold-500/40 bg-wood-950/70 p-6">
                    <p className="text-3xl">🚐</p>
                    <p className="font-serif text-2xl mt-2">Đặt bàn tại nhà hàng</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-cream/80">
                      <li>✦ <b className="text-gold-300">Giảm 10%</b> tổng hoá đơn</li>
                      <li>✦ <b className="text-gold-300">Xe đưa đón miễn phí</b></li>
                      <li>✦ Lumia ⇄ Louis Wine</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/lumia" className="btn-gold">Tôi là khách Lumia →</Link>
                </div>
              </div>
              <div className="relative">
                <img src="/images/lumia-apartment.jpg" alt="Lumia Apartment" className="rounded-3xl w-full h-[420px] object-cover border border-gold-500/20" />
                <div className="absolute -bottom-6 left-4 right-4 sm:left-8 sm:right-8 rounded-2xl bg-wood-950/95 border border-gold-500/30 p-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    ["1", "Quét QR trong phòng"],
                    ["2", "Chọn món / đặt bàn"],
                    ["3", "Giao tận phòng / xe đón"],
                  ].map(([n, t]) => (
                    <div key={n}>
                      <p className="mx-auto grid place-items-center h-8 w-8 rounded-full bg-gold-500 text-wood-950 font-bold text-sm">{n}</p>
                      <p className="text-xs mt-2 text-cream/80">{t}</p>
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
            <SectionTitle kicker="Đánh giá" title="Thực khách nói gì về Louis" sub="Mỗi góp ý giúp chúng tôi phục vụ bạn tốt hơn." />
            <ReviewSection initial={reviews} />
          </div>
        </section>

        {/* RESERVATION */}
        <section id="dat-ban" className="relative py-24 scroll-mt-20">
          <img src="/images/round-table.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-wood-950 via-wood-950/85 to-wood-950" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
            <SectionTitle kicker="Đặt bàn" title="Giữ chỗ cho buổi tối của bạn" sub="Đặt trước để chúng tôi chuẩn bị phòng, vang và món ăn chu đáo nhất." />
            <ReservationForm />
          </div>
        </section>

        {/* CONTACT */}
        <section id="lien-he" className="py-20 scroll-mt-20 border-t border-gold-500/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 grid lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-2xl border border-gold-500/20 bg-wood-900/60 p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-gold-500">Liên hệ</p>
              <h2 className="font-serif text-4xl mt-3">Kính chào quý khách!</h2>
              <div className="mt-6 space-y-4 text-cream/80">
                <p>📍 {RESTAURANT.address}</p>
                <p>
                  ☎{" "}
                  <a href={`tel:${RESTAURANT.hotlineRaw}`} className="text-gold-300 text-xl font-semibold">
                    {RESTAURANT.hotline}
                  </a>
                </p>
                <p>🕰 {RESTAURANT.hours}</p>
                <p>🚗 Bãi đỗ ô tô rộng rãi ngay sảnh</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={`tel:${RESTAURANT.hotlineRaw}`} className="btn-gold">Gọi ngay</a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RESTAURANT.mapQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline"
                >
                  Chỉ đường
                </a>
              </div>
            </div>
            <iframe
              title="Bản đồ Louis Wine"
              className="w-full min-h-80 rounded-2xl border border-gold-500/20 grayscale-[40%]"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(RESTAURANT.mapQuery)}&z=16&output=embed`}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
