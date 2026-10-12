"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { fmt } from "@/lib/site/i18n";
import type { OrderDict } from "@/lib/order-i18n";

/**
 * Review from the table: stars (+ optional comment/name) go privately to the manager
 * (hidden until published, Telegram alert); a QR code lets the guest also review on
 * Google from their own phone — the tablet itself stays on the menu.
 */
export default function FeedbackModal({ tableLabel, onClose, t }: { tableLabel: string; onClose: () => void; t: OrderDict["review"] }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/review-link")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.url && QRCode.toDataURL(d.url, { margin: 1, width: 240, errorCorrectionLevel: "M" }))
      .then((src) => src && setQr(src))
      .catch(() => {});
  }, []);

  async function send() {
    if (!rating) return setMsg({ ok: false, text: t.pickStars });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "table",
          customerName: name.trim() || `Khách bàn ${tableLabel}`,
          rating,
          comment: comment.trim(),
          visitType: "Ăn tại nhà hàng",
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) throw new Error(d?.error || "Error");
      setMsg({ ok: true, text: t.thanks });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const done = msg?.ok;
  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm-dialog review-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, color: "var(--color-accent)" }}>{t.title}</div>
        {!done && (
          <>
            <div className="review-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" aria-label={fmt(t.stars, { n: i })} className={i <= rating ? "on" : ""} onClick={() => setRating(i)}>
                  ★
                </button>
              ))}
            </div>
            <textarea className="input" rows={3} placeholder={t.commentPh} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
            <input className="input" placeholder={t.namePh} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            <button className="btn btn-primary btn-block" disabled={busy} onClick={send}>
              {busy ? t.sending : t.send}
            </button>
          </>
        )}
        {msg && <p style={{ margin: 0, fontSize: 14, color: msg.ok ? "var(--color-accent-2-700)" : "var(--color-accent)" }}>{msg.text}</p>}
        {qr && (
          <div className="review-google">
            <img src={qr} alt="" width={120} height={120} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800 }}>{t.google}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {t.googleSub}
              </div>
            </div>
          </div>
        )}
        <button className="btn btn-secondary btn-block" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}
