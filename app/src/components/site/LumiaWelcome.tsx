"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProviders";
import { RoomPicker } from "./RoomPicker";
import { IconRing } from "./icons";
import { Bus, ConciergeBell, Phone } from "lucide-react";
import { RESTAURANT } from "@/lib/site/constants";
import { fmt } from "@/lib/site/i18n";

type Props = {
  qr: { floor: number; room: string; key: string; verified: boolean } | null;
  invalidQr: boolean;
};

export function LumiaWelcome({ qr, invalidQr }: Props) {
  const { lumia, setLumia, ready, t } = useApp();
  const [floor, setFloor] = useState<number | "">("");
  const [room, setRoom] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (qr?.verified) {
      setLumia({ floor: qr.floor, room: qr.room, key: qr.key, verified: true, savedAt: Date.now() });
    }
  }, [qr, setLumia]);

  const active = ready ? lumia : null;
  const showPicker = ready && (!active || editing);
  const p = t.lumiaPage;

  return (
    <div className="max-w-2xl mx-auto">
      {invalidQr && (
        <p className="mb-6 rounded-xl border border-wine-500 bg-wine-900/50 px-4 py-3 text-sm">{fmt(p.invalidQr, { hotline: RESTAURANT.hotline })}</p>
      )}

      {active && !editing && (
        <div className="rounded-3xl border border-gold-500/40 bg-wood-900/80 p-6 sm:p-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-500">{p.welcome}</p>
          <p className="font-serif text-4xl sm:text-5xl mt-3">
            {p.roomTitle} <span className="gold-text">{active.room}</span>
          </p>
          <p className="text-cream/70 mt-1">Lumia Apartment</p>
          {active.verified ? (
            <p className="mt-3 inline-block text-xs rounded-full border border-gold-500/50 px-3 py-1 text-gold-300">{p.verified}</p>
          ) : (
            <p className="mt-3 inline-block text-xs rounded-full border border-cream/20 px-3 py-1 text-cream/60">{p.unverified}</p>
          )}

          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-left">
            <Link href="/menu" className="group rounded-2xl border border-gold-500/30 bg-wood-950/70 p-5 hover:border-gold-500 transition">
              <IconRing icon={ConciergeBell} />
              <p className="font-serif text-2xl mt-3 group-hover:text-gold-300">{p.orderTitle}</p>
              <p className="text-sm text-cream/70 mt-1">{fmt(p.orderText, { room: active.room })}</p>
              <p className="mt-4 text-sm text-gold-400">{p.orderCta}</p>
            </Link>
            <Link href="/#dat-ban" className="group rounded-2xl border border-gold-500/30 bg-wood-950/70 p-5 hover:border-gold-500 transition">
              <IconRing icon={Bus} />
              <p className="font-serif text-2xl mt-3 group-hover:text-gold-300">{p.bookTitle}</p>
              <p className="text-sm text-cream/70 mt-1">{p.bookText}</p>
              <p className="mt-4 text-sm text-gold-400">{p.bookCta}</p>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="btn-outline !py-2">
              <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {fmt(p.call, { hotline: RESTAURANT.hotline })}
            </a>
            {!active.verified && (
              <button className="btn-outline !py-2" onClick={() => setEditing(true)}>
                {p.changeRoom}
              </button>
            )}
            <button
              className="text-cream/40 hover:text-cream/70 underline underline-offset-4"
              onClick={() => {
                setLumia(null);
                setEditing(false);
              }}
            >
              {p.checkedOut}
            </button>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="rounded-3xl border border-gold-500/30 bg-wood-900/80 p-6 sm:p-8">
          <p className="font-serif text-3xl">{p.pickTitle}</p>
          <p className="text-cream/60 text-sm mt-2">{p.pickText}</p>
          <div className="mt-6">
            <RoomPicker
              floor={floor}
              room={room}
              onChange={(f, r) => {
                setFloor(f);
                setRoom(r);
              }}
            />
          </div>
          <button
            className="btn-gold mt-6 w-full"
            disabled={!floor || !room}
            onClick={() => {
              if (!floor || !room) return;
              setLumia({ floor, room, key: null, verified: false, savedAt: Date.now() });
              setEditing(false);
            }}
          >
            {fmt(p.confirm, { room: room || "???" })}
          </button>
        </div>
      )}
    </div>
  );
}
