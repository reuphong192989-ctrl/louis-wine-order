"use client";

import { formatVnd } from "@/lib/format";

export type CartLine = {
  itemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
};

type OrderStatus = "idle" | "sending" | "sent" | "error";

export default function CartDrawer({
  open,
  onClose,
  lines,
  total,
  orderStatus,
  errorMessage,
  onInc,
  onDec,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  total: number;
  orderStatus: OrderStatus;
  errorMessage: string | null;
  onInc: (itemId: string) => void;
  onDec: (itemId: string) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const sendLabel =
    orderStatus === "sending"
      ? "Đang gửi..."
      : orderStatus === "sent"
        ? "Đã gửi yêu cầu — nhân viên sẽ tới ngay"
        : "Gửi yêu cầu tới nhân viên";

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <div className="cart-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Giỏ hàng</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
        <hr className="hr" style={{ margin: 0 }} />

        <div className="scroll-y" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {lines.length === 0 && <p className="text-muted">Chưa có món nào trong giỏ.</p>}
          {lines.map((line) => (
            <div className="cart-line" key={line.itemId}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13 }}>{line.name}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {formatVnd(line.unitPrice)} × {line.qty}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="cart-qty-btn" onClick={() => onDec(line.itemId)} aria-label="Giảm số lượng">
                  –
                </button>
                <span style={{ width: 20, textAlign: "center", fontSize: 13 }}>{line.qty}</span>
                <button className="cart-qty-btn" onClick={() => onInc(line.itemId)} aria-label="Tăng số lượng">
                  +
                </button>
              </div>
              <span style={{ width: 90, textAlign: "right", fontWeight: 700, fontSize: 13 }}>{formatVnd(line.lineTotal)}</span>
            </div>
          ))}
        </div>

        <hr className="hr" style={{ margin: 0 }} />
        <div className="cart-total-row">
          <span>Tổng</span>
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
