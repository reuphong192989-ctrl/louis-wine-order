export function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

/** 2 → "2", 1.25 → "1,25" — quantities can be fractional for items sold by weight (kg). */
export function formatQty(qty: number): string {
  return qty.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
