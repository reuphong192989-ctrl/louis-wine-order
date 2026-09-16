"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";
import { parseCookingNote } from "@/lib/parse-cooking-note";
import type { MenuItemDTO } from "@/types";

export default function MenuItemModal({
  item,
  isBottle = false,
  onClose,
  onAdd,
}: {
  item: MenuItemDTO;
  isBottle?: boolean;
  onClose: () => void;
  onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const canOrder = item.priceValue != null;
  const parsedNote = item.note ? parseCookingNote(item.note) : null;

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "relative", flex: "none" }}>
          {item.imageUrl ? (
            <img
              className={`detail-img ${isBottle ? "detail-img--bottle" : ""}`}
              src={item.imageUrl}
              alt={item.name}
            />
          ) : (
            <div className="detail-img detail-img-placeholder">Chưa có ảnh</div>
          )}
          <button className="detail-close-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="detail-body scroll-y">
          <h3 style={{ margin: 0 }}>{item.name}</h3>

          {parsedNote?.methods ? (
            <div>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Có thể chế biến:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {parsedNote.methods.map((m) => (
                  <span className="tag tag-neutral" key={m}>
                    {m}
                  </span>
                ))}
              </div>
              {parsedNote.intro && (
                <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {parsedNote.intro}
                </div>
              )}
            </div>
          ) : (
            parsedNote?.plain && (
              <p className="text-muted" style={{ margin: 0 }}>
                {parsedNote.plain}
              </p>
            )
          )}

          <div className="detail-price">{item.priceText}</div>
        </div>

        <div className="detail-footer">
          {canOrder ? (
            <>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm số lượng">
                  –
                </button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Tăng số lượng">
                  +
                </button>
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  onAdd(qty);
                  onClose();
                }}
              >
                Thêm vào giỏ · {formatVnd(item.priceValue! * qty)}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-block" disabled>
              Vui lòng gọi nhân viên để đặt món này
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
