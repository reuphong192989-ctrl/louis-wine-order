"use client";

import type { OrderDict } from "@/lib/order-i18n";

/** Shown right after an order is sent: thank-you + what's next (my orders, review, call staff, back to menu). */
export default function OrderSentDialog({
  onClose,
  onCallStaff,
  onHistory,
  onReview,
  callStaffDisabled,
  t,
}: {
  onClose: () => void;
  onCallStaff: () => void;
  onHistory: () => void;
  onReview: () => void;
  callStaffDisabled: boolean;
  t: OrderDict["sent"];
}) {
  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm-dialog sent-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="sent-check" aria-hidden>
          ✓
        </div>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20, color: "var(--color-accent)" }}>{t.title}</div>
        <p style={{ margin: 0, fontSize: 14 }}>{t.text}</p>
        <div className="sent-actions">
          <button type="button" className="sent-card" onClick={onHistory}>
            <span className="sent-card-title">{t.history}</span>
          </button>
          <button type="button" className="sent-card sent-card--review" onClick={onReview}>
            <span className="sent-card-title">★ {t.review}</span>
            <span className="sent-card-sub">{t.reviewSub}</span>
          </button>
        </div>
        <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
          {t.wait}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} disabled={callStaffDisabled} onClick={onCallStaff}>
            {t.call}
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
