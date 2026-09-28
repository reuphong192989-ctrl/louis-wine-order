"use client";

import Link from "next/link";
import { useApp } from "./AppProviders";
import { RESTAURANT } from "@/lib/site/constants";

export function Footer() {
  const { t } = useApp();
  return (
    <footer className="no-print border-t border-gold-500/15 bg-wood-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Logo Louis Wine" width={56} height={56} className="h-14 w-14" />
            <p className="font-serif text-3xl gold-text">Louis Wine</p>
          </div>
          <p className="mt-3 text-cream/60 max-w-md text-sm leading-relaxed">{t.footer.about}</p>
        </div>
        <div className="text-sm space-y-2">
          <p className="text-gold-400 font-semibold mb-3">{t.footer.contact}</p>
          <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="block text-cream/70 hover:text-gold-300">
            {t.restaurant.address}
          </a>
          <p>
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="text-cream/70 hover:text-gold-300">
              Hotline: {RESTAURANT.hotline}
            </a>
          </p>
          <p className="text-cream/70">
            {t.footer.open}: {t.restaurant.hours}
          </p>
        </div>
        <div className="text-sm space-y-2">
          <p className="text-gold-400 font-semibold mb-3">{t.footer.explore}</p>
          <Link href="/menu" className="block text-cream/70 hover:text-gold-300">{t.footer.menu}</Link>
          <Link href="/#dat-ban" className="block text-cream/70 hover:text-gold-300">{t.footer.book}</Link>
          <Link href="/#lumia" className="block text-cream/70 hover:text-gold-300">{t.footer.lumia}</Link>
          <Link href="/#danh-gia" className="block text-cream/70 hover:text-gold-300">{t.footer.reviews}</Link>
          <Link href="/admin" className="block text-cream/40 hover:text-gold-300">{t.footer.staff}</Link>
        </div>
      </div>
      <div className="divider-gold" />
      <p className="text-center text-xs text-cream/40 py-5">© {new Date().getFullYear()} Louis Wine Đà Nẵng. All rights reserved.</p>
    </footer>
  );
}
