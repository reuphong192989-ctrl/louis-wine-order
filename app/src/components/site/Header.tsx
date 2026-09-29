"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { useApp } from "./AppProviders";
import { RESTAURANT } from "@/lib/site/constants";
import { LANGS, LANG_LABEL, fmt } from "@/lib/site/i18n";

function LangSwitch({ className = "flex" }: { className?: string }) {
  const { lang, setLang, t } = useApp();
  return (
    <div role="group" aria-label={t.nav.language} className={`rounded-full border border-gold-500/40 overflow-hidden text-xs ${className}`}>
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

/** Phones: one round button showing the current language; tap to pick another. */
function LangMenu({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.nav.language}
        aria-expanded={open}
        className="grid place-items-center h-10 w-10 rounded-full border border-gold-500/40 text-xs font-bold text-gold-300"
      >
        {LANG_LABEL[lang]}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 grid rounded-xl border border-gold-500/30 bg-wood-950/95 backdrop-blur p-1 shadow-xl">
          {LANGS.map((l) => (
            <button
              key={l}
              role="menuitemradio"
              aria-checked={l === lang}
              onClick={() => {
                setOpen(false);
                if (l !== lang) setLang(l);
              }}
              className={`w-14 rounded-lg py-2 text-sm font-semibold ${l === lang ? "bg-gold-500 text-wood-950" : "text-cream/80"}`}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      )}
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
            <span className="leading-tight min-w-0">
              <span className="block font-serif text-lg sm:text-xl gold-text font-semibold whitespace-nowrap">Louis Wine</span>
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
            <LangMenu className="sm:hidden" />
            <LangSwitch className="hidden sm:flex" />
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="hidden 2xl:inline-flex items-center gap-1.5 text-sm text-gold-300 mx-1">
              <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {RESTAURANT.hotline}
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
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="py-2 text-gold-300 flex items-center gap-2">
              <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Hotline {RESTAURANT.hotline}
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
