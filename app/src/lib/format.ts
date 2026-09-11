export function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
