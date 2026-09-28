import { DELIVERY_FEE, LUMIA } from "./constants";

export type OnlineChannel = "PICKUP" | "DELIVERY" | "LUMIA_ROOM";

export function computeTotals(subtotal: number, channel: OnlineChannel) {
  const discount = channel === "LUMIA_ROOM" ? Math.round(subtotal * LUMIA.discountRate) : 0;
  const shippingFee = channel === "DELIVERY" ? DELIVERY_FEE : 0;
  const total = Math.max(0, subtotal - discount + shippingFee);
  return { subtotal, discount, shippingFee, total };
}

export function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}
