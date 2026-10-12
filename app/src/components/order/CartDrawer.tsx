"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";
import type { OrderDict } from "@/lib/order-i18n";

export type CartLine = {
  itemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  note: string;
};

type OrderStatus = "idle" | "sending" | "sent" | "error";

const MAX_QTY = 999; // same ceiling the orders API enforces

/** Type a quantity directly (1–999). While editing, an empty box is allowed; on blur it snaps back to the real value. */
function QtyInput({ value, onCommit }: { value: number; onCommit: (qty: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className="input"
      style={{ width: 48, textAlign: "center", fontSize: 14, padding: "4px 0", minHeight: 0 }}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label="SL"
      value={draft ?? String(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
        setDraft(digits);
        const n = Number(digits);
        if (digits !== "" && n >= 1) onCommit(Math.min(n, MAX_QTY));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export default function CartDrawer({
  open,
  onClose,
  lines,
  total,
  orderStatus,
  errorMessage,
  onInc,
  onDec,
  onSetQty,
  onNoteChange,
  onSubmit,
  t,
}: {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  total: number;
  orderStatus: OrderStatus;
  errorMessage: string | null;
  onInc: (itemId: string) => void;
  onDec: (itemId: string) => void;
  onSetQty: (itemId: string, qty: number) => void;
  onNoteChange: (itemId: string, note: string) => void;
  onSubmit: () => void;
  t: OrderDict["drawer"];
}) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  if (!open) return null;

  const sendLabel =
    orderStatus === "sending" ? t.sending : orderStatus === "sent" ? t.sent : t.send;

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <div className="cart-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{t.title}</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            {t.close}
          </button>
        </div>
        <hr className="hr" style={{ margin: 0 }} />

        <div className="scroll-y" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {lines.length === 0 && <p className="text-muted">{t.empty}</p>}
          {lines.map((line) => (
            <div key={line.itemId} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="cart-line">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13 }}>{line.name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {formatVnd(line.unitPrice)} × {line.qty}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button className="cart-qty-btn" onClick={() => onDec(line.itemId)} aria-label={t.dec}>
                    –
                  </button>
                  <QtyInput value={line.qty} onCommit={(n) => onSetQty(line.itemId, n)} />
                  <button className="cart-qty-btn" onClick={() => onInc(line.itemId)} aria-label={t.inc}>
                    +
                  </button>
                </div>
                <span style={{ width: 90, textAlign: "right", fontWeight: 700, fontSize: 13 }}>{formatVnd(line.lineTotal)}</span>
              </div>

              {line.note || expandedNotes.has(line.itemId) ? (
                <input
                  className="input"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                  placeholder={t.notePh}
                  value={line.note}
                  onChange={(e) => onNoteChange(line.itemId, e.target.value)}
                />
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 11, alignSelf: "flex-start", padding: "2px 0", height: "auto" }}
                  onClick={() => setExpandedNotes((s) => new Set(s).add(line.itemId))}
                >
                  {t.addNote}
                </button>
              )}
            </div>
          ))}
        </div>

        <hr className="hr" style={{ margin: 0 }} />
        <div className="cart-total-row">
          <span>{t.total}</span>
          <span style={{ color: "var(--color-accent)" }}>{formatVnd(total)}</span>
        </div>

        {errorMessage && (
          <div style={{ fontSize: 12, color: "var(--color-accent)" }}>{errorMessage}</div>
        )}

        <button
          className="btn btn-primary btn-block"
          disabled={lines.length === 0 || orderStatus === "sending" || orderStatus === "sent"}
          onClick={onSubmit}
        >
          {sendLabel}
        </button>
      </div>
    </div>
  );
}
