"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "./AppProviders";
import { fmt } from "@/lib/site/i18n";

const WELCOME_KEY = "louis-qr-welcome";

type Props = {
  qr: { floor: number; room: string; key: string } | null;
  invalid: boolean;
};

/**
 * Shown on the home page after scanning a room QR code. Guests usually don't
 * know Louis Wine yet, so instead of dropping them into the order form we
 * remember their room (10% off / free room delivery apply automatically) and
 * greet them over the restaurant introduction.
 */
export function LumiaQrWelcome({ qr, invalid }: Props) {
  const { setLumia, t } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const scanId = qr ? `${qr.room}:${qr.key}` : invalid ? "invalid" : null;

  useEffect(() => {
    if (!scanId) return;
    if (qr) setLumia({ floor: qr.floor, room: qr.room, key: qr.key, verified: true, savedAt: Date.now() });
    // Greet once per scan: the page re-renders (e.g. switching language) with the same ?room=&k=.
    let seen = false;
    try {
      seen = sessionStorage.getItem(WELCOME_KEY) === scanId;
      sessionStorage.setItem(WELCOME_KEY, scanId);
    } catch {
      /* private mode: just show it */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open once on arrival from a QR scan
    if (!seen) setOpen(true);
    // Drop ?room=&k= from the address (through the router, so a later refresh doesn't bring it back)
    // — a shared or bookmarked link then doesn't carry the room key.
    router.replace(window.location.pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the scan, not on object identity
  }, [scanId]);

  if (!open) return null;
  const w = t.qrWelcome;

  return (
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-gold-500/40 bg-wood-900 p-6 sm:p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img src="/images/logo.png" alt="" width={64} height={64} className="mx-auto h-16 w-16" />
        {qr ? (
          <>
            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-gold-500">{w.kicker}</p>
            <h2 className="font-serif text-3xl mt-2 gold-text">{fmt(w.title, { room: qr.room })}</h2>
            <p className="mt-3 text-sm text-cream/75 leading-relaxed">{w.text}</p>
            <ul className="mt-4 space-y-2 text-left text-sm">
              {w.perks.map((p) => (
                <li key={p} className="flex gap-2 rounded-xl bg-wood-950/70 px-3 py-2">
                  <span className="text-gold-400">✦</span>
                  <span className="text-cream/90">{p}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4 text-sm text-cream/80">{w.invalid}</p>
        )}
        <div className="mt-6 grid gap-2">
          <button className="btn-gold w-full" onClick={() => setOpen(false)}>
            {w.explore}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/menu" className="btn-outline !px-3 text-sm">
              {w.menu}
            </Link>
            <Link href="/#dat-ban" className="btn-outline !px-3 text-sm" onClick={() => setOpen(false)}>
              {w.book}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
