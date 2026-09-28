"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "./AppProviders";
import { RESTAURANT } from "@/lib/site/constants";
import { LANGS, LANG_LABEL, fmt } from "@/lib/site/i18n";

function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useApp();
  return (
    <div role="group" aria-label={t.nav.language} className={`flex rounded-full border border-gold-500/40 overflow-hidden text-xs ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => l !== lang && setLang(l)}
          aria-pressed={l === lang}
          className={`px-2 sm:px-2.5 py-1.5 font-semibold transition ${l === lang ? "bg-gold-500 text-wood-950" : "text-cream/70 hover:text-gold-300"}`}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { cartCount, lumia, ready, t } = useApp();
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/#gioi-thieu", label: t.nav.about },
    { href: "/menu", label: t.nav.menu },
    { href: "/#lumia", label: t.nav.lumia },
    { href: "/#danh-gia", label: t.nav.reviews },
    { href: "/#dat-ban", label: t.nav.book },
    { href: "/#lien-he", label: t.nav.contact },
  ];

  return (
    <header className="no-print fixed inset-x-0 top-0 z-40">
      {ready && lumia && (
        <div className="bg-gradient-to-r from-wine-800 via-wine-600 to-wine-800 text-center text-xs sm:text-sm py-1.5 px-3 text-cream">
          {fmt(t.nav.lumiaBanner, { room: lumia.room })}
        </div>
      )}
      <div className="bg-wood-950/85 backdrop-blur-md border-b border-gold-500/15">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/images/logo.png" alt="Logo Louis Wine" width={40} height={40} className="h-10 w-10 shrink-0" />
            <span className="leading-tight hidden min-[400px]:block">
              <span className="block font-serif text-xl gold-text font-semibold">Louis Wine</span>
              <span className="block text-[10px] tracking-[0.3em] uppercase text-cream/50">Đà Nẵng</span>
            </span>
          </Link>

          <nav className="hidden xl:flex items-center gap-6 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-cream/75 hover:text-gold-300 transition whitespace-nowrap">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LangSwitch />
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="hidden 2xl:inline text-sm text-gold-300 mx-1">
              ☎ {RESTAURANT.hotline}
            </a>
            <Link
              href="/menu#gio-hang"
              onClick={() => window.dispatchEvent(new Event("louis:open-cart"))}
              className="relative grid place-items-center h-10 w-10 rounded-full border border-gold-500/40 hover:bg-gold-500/10"
              aria-label={t.nav.cart}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gold-300">
                <path d="M6 7h12l-1 13H7L6 7Z" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              {ready && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-wine-500 text-[11px] font-bold grid place-items-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/#dat-ban" className="hidden md:inline-flex btn-gold !py-2 !px-4 text-sm whitespace-nowrap">
              {t.nav.book}
            </Link>
            <button
              className="xl:hidden grid place-items-center h-10 w-10 rounded-full border border-gold-500/40"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              <span className="text-gold-300 text-lg">{open ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
        {open && (
          <nav className="xl:hidden border-t border-gold-500/15 px-4 py-3 grid gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="py-2 text-cream/85">
                {n.label}
              </Link>
            ))}
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="py-2 text-gold-300">
              ☎ Hotline {RESTAURANT.hotline}
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
