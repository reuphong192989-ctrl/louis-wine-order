"use client";

import { useState } from "react";
import { useApp } from "./AppProviders";
import type { ReviewDTO } from "@/lib/site/queries";
import { DICTS, INTL_LOCALE, fmt } from "@/lib/site/i18n";

type Data = { count: number; avg: number; dist: { star: number; n: number }[]; list: ReviewDTO[] };

// Stored (and shown to staff) in Vietnamese; displayed in the visitor's language.
const VISITS_VI = DICTS.vi.reviews.visits;

function Stars({ value, size = "text-base", label }: { value: number; size?: string; label: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? "text-gold-400" : "text-cream/20"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ReviewSection({ initial }: { initial: Data }) {
  const { lumia, lang, t } = useApp();
  const [data, setData] = useState<Data>(initial);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [visitIdx, setVisitIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visitLabel = (v: string | null) => {
    if (!v) return "";
    const idx = VISITS_VI.indexOf(v);
    return idx >= 0 ? t.reviews.visits[idx] : v;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!rating) {
      setMsg({ ok: false, text: t.reviews.pickStars });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, rating, comment, visitType: VISITS_VI[visitIdx], isLumiaGuest: !!lumia }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setMsg({ ok: true, text: t.reviews.thanks });
      setRating(0);
      setComment("");
      const fresh = await fetch("/api/reviews", { cache: "no-store" }).then((r) => r.json());
      if (fresh?.list) setData(fresh);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t.cart.errGeneric });
    } finally {
      setLoading(false);
    }
  }

  const list = showAll ? data.list : data.list.slice(0, 6);

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-8">
      <div className="space-y-6">
        <div className="rounded-2xl border border-gold-500/25 bg-wood-900/70 p-6">
          <div className="flex items-end gap-4">
            <p className="font-serif text-6xl gold-text leading-none">{data.count ? data.avg.toFixed(1) : "—"}</p>
            <div>
              <Stars value={data.avg} size="text-xl" label={fmt(t.reviews.stars, { n: data.avg.toFixed(1) })} />
              <p className="text-sm text-cream/60">{fmt(t.reviews.count, { n: data.count })}</p>
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            {data.dist.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-cream/70">{d.star}★</span>
                <div className="flex-1 h-2 rounded-full bg-cream/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-600 to-gold-300" style={{ width: `${data.count ? (d.n / data.count) * 100 : 0}%` }} />
                </div>
                <span className="w-6 text-right text-cream/50">{d.n}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-gold-500/25 bg-wood-900/70 p-6 grid gap-3">
          <p className="font-serif text-xl text-gold-300">{t.reviews.share}</p>
          <div className="flex gap-1 text-3xl" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                type="button"
                key={i}
                onMouseEnter={() => setHover(i)}
                onClick={() => setRating(i)}
                className={`transition ${(hover || rating) >= i ? "text-gold-400 scale-110" : "text-cream/25"}`}
                aria-label={fmt(t.reviews.stars, { n: i })}
              >
                ★
              </button>
            ))}
          </div>
          <input className="input" placeholder={t.reviews.name} value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="input" value={visitIdx} onChange={(e) => setVisitIdx(Number(e.target.value))}>
            {t.reviews.visits.map((v, i) => (
              <option key={i} value={i}>
                {v}
              </option>
            ))}
          </select>
          <textarea className="input min-h-24" placeholder={t.reviews.commentPh} value={comment} onChange={(e) => setComment(e.target.value)} required />
          {msg && <p className={`text-sm ${msg.ok ? "text-gold-300" : "text-wine-300"}`}>{msg.text}</p>}
          <button className="btn-gold" disabled={loading}>
            {loading ? t.reviews.sending : t.reviews.submit}
          </button>
        </form>
      </div>

      <div>
        {data.list.length === 0 ? (
          <div className="h-full min-h-60 rounded-2xl border border-dashed border-gold-500/30 grid place-items-center text-center p-8">
            <div>
              <p className="text-4xl">✨</p>
              <p className="font-serif text-2xl mt-2">{t.reviews.emptyTitle}</p>
              <p className="text-cream/60 mt-1">{t.reviews.emptySub}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              {list.map((r) => (
                <article key={r.id} className="rounded-2xl border border-gold-500/15 bg-wood-900/50 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="grid place-items-center h-10 w-10 rounded-full bg-wine-700 font-serif text-lg text-gold-300">
                        {r.customerName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{r.customerName}</p>
                        <p className="text-xs text-cream/50">
                          {new Date(r.createdAt).toLocaleDateString(INTL_LOCALE[lang])}
                          {r.visitType ? ` · ${visitLabel(r.visitType)}` : ""}
                        </p>
                      </div>
                    </div>
                    <Stars value={r.rating} size="text-sm" label={fmt(t.reviews.stars, { n: r.rating })} />
                  </div>
                  <p className="mt-3 text-sm text-cream/80 leading-relaxed whitespace-pre-line">{r.comment}</p>
                  {r.isLumiaGuest && (
                    <span className="mt-3 inline-block text-[10px] uppercase tracking-wider rounded-full border border-gold-500/40 px-2 py-0.5 text-gold-400">
                      {t.reviews.lumiaGuest}
                    </span>
                  )}
                </article>
              ))}
            </div>
            {data.list.length > 6 && (
              <button className="btn-outline mt-5" onClick={() => setShowAll((s) => !s)}>
                {showAll ? t.reviews.collapse : fmt(t.reviews.showAll, { n: data.list.length })}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
