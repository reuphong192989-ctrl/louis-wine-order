"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "./AppProviders";
import { RESTAURANT } from "@/lib/site/constants";

const NAV = [
  { href: "/#gioi-thieu", label: "Giới thiệu" },
  { href: "/menu", label: "Thực đơn" },
  { href: "/#lumia", label: "Ưu đãi Lumia" },
  { href: "/#danh-gia", label: "Đánh giá" },
  { href: "/#dat-ban", label: "Đặt bàn" },
  { href: "/#lien-he", label: "Liên hệ" },
];

export function Header() {
  const { cartCount, lumia, ready } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="no-print fixed inset-x-0 top-0 z-40">
      {ready && lumia && (
        <div className="bg-gradient-to-r from-wine-800 via-wine-600 to-wine-800 text-center text-xs sm:text-sm py-1.5 px-3 text-cream">
          <span className="font-semibold text-gold-300">Khách Lumia Apartment</span> · Tầng {lumia.floor} · Phòng{" "}
          {lumia.room} — Giảm 10% hoá đơn · Free ship về phòng · Xe đưa đón miễn phí khi đặt bàn
        </div>
      )}
      <div className="bg-wood-950/85 backdrop-blur-md border-b border-gold-500/15">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/images/logo.png" alt="Logo Louis Wine" width={40} height={40} className="h-10 w-10" />
            <span className="leading-tight">
              <span className="block font-serif text-xl gold-text font-semibold">Louis Wine</span>
              <span className="block text-[10px] tracking-[0.3em] uppercase text-cream/50">Đà Nẵng</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-cream/75 hover:text-gold-300 transition">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="hidden md:inline text-sm text-gold-300 mr-2">
              ☎ {RESTAURANT.hotline}
            </a>
            <Link
              href="/menu#gio-hang"
              onClick={() => window.dispatchEvent(new Event("louis:open-cart"))}
              className="relative grid place-items-center h-10 w-10 rounded-full border border-gold-500/40 hover:bg-gold-500/10"
              aria-label="Giỏ hàng"
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
            <Link href="/#dat-ban" className="hidden sm:inline-flex btn-gold !py-2 !px-4 text-sm">
              Đặt bàn
            </Link>
            <button
              className="lg:hidden grid place-items-center h-10 w-10 rounded-full border border-gold-500/40"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              <span className="text-gold-300 text-lg">{open ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
        {open && (
          <nav className="lg:hidden border-t border-gold-500/15 px-4 py-3 grid gap-1">
            {NAV.map((n) => (
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
