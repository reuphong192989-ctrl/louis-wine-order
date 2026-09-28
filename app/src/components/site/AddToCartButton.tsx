"use client";

import { useState } from "react";
import { useApp } from "./AppProviders";
import { RESTAURANT } from "@/lib/site/constants";

type Props = {
  item: { id: string; name: string; priceValue: number | null; imageUrl: string | null; available: boolean };
  compact?: boolean;
};

export function AddToCartButton({ item, compact }: Props) {
  const { add, cart } = useApp();
  const [flash, setFlash] = useState(false);
  const inCart = cart.find((c) => c.itemId === item.id)?.qty ?? 0;

  if (!item.available) {
    return <span className="text-xs text-cream/40 italic">Tạm hết</span>;
  }
  if (item.priceValue == null) {
    return (
      <a href={`tel:${RESTAURANT.hotlineRaw}`} className="text-xs text-gold-300 underline underline-offset-4">
        Gọi báo giá
      </a>
    );
  }
  return (
    <button
      onClick={() => {
        add({ itemId: item.id, name: item.name, price: item.priceValue!, imageUrl: item.imageUrl });
        setFlash(true);
        setTimeout(() => setFlash(false), 900);
      }}
      className={`relative inline-flex items-center gap-1.5 rounded-full font-semibold transition ${
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${flash ? "bg-gold-300 text-wood-900 scale-105" : "bg-wine-600 hover:bg-wine-500 text-cream"}`}
    >
      {flash ? "✓ Đã thêm" : "+ Thêm"}
      {inCart > 0 && !flash && (
        <span className="ml-0.5 rounded-full bg-gold-400 text-wood-900 text-[10px] px-1.5">{inCart}</span>
      )}
    </button>
  );
}
