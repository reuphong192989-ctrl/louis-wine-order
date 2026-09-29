"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useApp } from "./AppProviders";
import { IconRing } from "./icons";
import type { ReviewDTO } from "@/lib/site/queries";
import type { GooglePlace } from "@/lib/site/google-reviews";
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

function Avatar({ name, photo }: { name: string; photo?: string | null }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={40} height={40} referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <span className="grid place-items-center h-10 w-10 rounded-full bg-wine-700 font-serif text-lg text-gold-300">{name.charAt(0).toUpperCase()}</span>
  );
}

/**
 * Public rating = the real Google Maps rating (when GOOGLE_PLACES_API_KEY is set),
 * otherwise links to Google. The form sends private feedback to the manager;
 * the manager can publish it from Quản trị → Đánh giá khách.
 */
export function ReviewSection({ initial, google, mapsUrl }: { initial: Data; google: GooglePlace | null; mapsUrl: string }) {
  const { lumia, lang, t } = useApp();
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

  const viewUri = google?.reviewsUri ?? mapsUrl;
  const writeUri = google?.writeReviewUri ?? mapsUrl;
  const googleReviews = google?.reviews ?? [];
  const site = initial.list;
  const siteShown = showAll ? site : site.slice(0, 4);

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
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t.cart.errGeneric });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-8">
      <div className="space-y-6">
        <div className="rounded-2xl border border-gold-500/25 bg-wood-900/70 p-6">
          {google && google.count > 0 ? (
            <div className="flex items-end gap-4">
              <p className="font-serif text-6xl gold-text leading-none">{google.rating.toFixed(1)}</p>
              <div>
                <Stars value={google.rating} size="text-xl" label={fmt(t.reviews.stars, { n: google.rating.toFixed(1) })} />
                <p className="text-sm text-cream/60">{fmt(t.reviews.googleCount, { n: google.count })}</p>
              </div>
            </div>
          ) : (
            <p className="font-serif text-xl text-cream/85">{t.reviews.googleTitle}</p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={viewUri} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-2.5 text-sm">
              {t.reviews.viewGoogle}
            </a>
            <a href={writeUri} target="_blank" rel="noopener noreferrer" className="btn-gold px-3 py-2.5 text-sm">
              {t.reviews.writeGoogle}
            </a>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-gold-500/25 bg-wood-900/70 p-6 grid gap-3">
          <div>
            <p className="font-serif text-xl text-gold-300">{t.reviews.share}</p>
            <p className="text-xs text-cream/55 mt-1">{t.reviews.shareSub}</p>
          </div>
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

      <div className="space-y-8">
        {googleReviews.length > 0 && (
          <div>
            <div className="grid sm:grid-cols-2 gap-4">
              {googleReviews.map((r, i) => (
                <article key={i} className="rounded-2xl border border-gold-500/15 bg-wood-900/50 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={r.author} photo={r.photoUri} />
                      <div className="min-w-0">
                        {r.authorUri ? (
                          <a href={r.authorUri} target="_blank" rel="noopener noreferrer" className="font-semibold leading-tight hover:text-gold-300 block truncate">
                            {r.author}
                          </a>
                        ) : (
                          <p className="font-semibold leading-tight truncate">{r.author}</p>
                        )}
                        <p className="text-xs text-cream/50">
                          {r.when} · {t.reviews.onGoogle}
                        </p>
                      </div>
                    </div>
                    <Stars value={r.rating} size="text-sm" label={fmt(t.reviews.stars, { n: r.rating })} />
                  </div>
                  <p className="mt-3 text-sm text-cream/80 leading-relaxed whitespace-pre-line line-clamp-6">{r.text}</p>
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs text-cream/40">{t.reviews.googleSource}</p>
          </div>
        )}

        {site.length > 0 && (
          <div>
            {googleReviews.length > 0 && <p className="text-xs uppercase tracking-[0.3em] text-gold-500 mb-4">{t.reviews.fromWebsite}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              {siteShown.map((r) => (
                <article key={r.id} className="rounded-2xl border border-gold-500/15 bg-wood-900/50 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.customerName} />
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
            {site.length > 4 && (
              <button className="btn-outline mt-5" onClick={() => setShowAll((s) => !s)}>
                {showAll ? t.reviews.collapse : fmt(t.reviews.showAll, { n: site.length })}
              </button>
            )}
          </div>
        )}

        {googleReviews.length === 0 && site.length === 0 && (
          <div className="h-full min-h-60 rounded-2xl border border-dashed border-gold-500/30 grid place-items-center text-center p-8">
            <div>
              <IconRing icon={Sparkles} />
              <p className="font-serif text-2xl mt-3">{t.reviews.emptyTitle}</p>
              <p className="text-cream/60 mt-1">{t.reviews.emptySub}</p>
              <a href={writeUri} target="_blank" rel="noopener noreferrer" className="btn-gold mt-5">
                {t.reviews.writeGoogle}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
