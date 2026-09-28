"use client";

import type { OrderDict } from "@/lib/order-i18n";

export default function OrderSentDialog({
  onClose,
  onCallStaff,
  callStaffDisabled,
  t,
}: {
  onClose: () => void;
  onCallStaff: () => void;
  callStaffDisabled: boolean;
  t: OrderDict["sent"];
}) {
  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, color: "var(--color-accent)" }}>
          {t.title}
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>
          {t.text}
        </p>
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
          {t.wait}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <button className="btn btn-secondary btn-block" disabled={callStaffDisabled} onClick={onCallStaff}>
            {t.call}
          </button>
          <button className="btn btn-primary btn-block" onClick={onClose}>
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
