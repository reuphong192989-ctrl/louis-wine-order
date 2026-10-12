/**
 * Bill arithmetic shared by the server (finalize) and the cashier screen (live total), so the number on the
 * screen is always the number printed. Pure — no server/DB imports.
 *
 * Prices are VAT-exclusive: total = subtotal − discount + VAT. The discount is spread over the lines in
 * proportion to their value, so VAT is charged on the *discounted* price of each VAT group.
 */

export type BillGroup = "FOOD" | "DRINK" | "OTHER";
export const BILL_GROUPS: readonly BillGroup[] = ["FOOD", "DRINK", "OTHER"];
export const BILL_GROUP_LABEL: Record<BillGroup, string> = { FOOD: "ĐỒ ĂN", DRINK: "ĐỒ UỐNG", OTHER: "KHÁC" };

/** `base` is the amount VAT is charged on (after the group's share of the discount). */
export type VatGroup = { rate: number; base: number; amount: number };

export type DiscountInput = { type: "amount" | "percent"; value: number } | null;

export type BillTotals = {
  subtotal: number;
  discountAmount: number;
  /** Set only when the discount was entered as a percentage. */
  discountPercent: number | null;
  vatGroups: VatGroup[];
  totalVat: number;
  total: number;
};

export function computeBill(lines: { lineTotal: number; vatRate: number }[], discount: DiscountInput): BillTotals {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let discountAmount = 0;
  let discountPercent: number | null = null;
  if (discount && Number.isFinite(discount.value) && discount.value > 0) {
    if (discount.type === "percent") {
      discountPercent = Math.min(100, discount.value);
      discountAmount = Math.round((subtotal * discountPercent) / 100);
    } else {
      discountAmount = Math.min(subtotal, Math.round(discount.value));
    }
  }

  const bases = new Map<number, number>();
  for (const l of lines) bases.set(l.vatRate, (bases.get(l.vatRate) ?? 0) + l.lineTotal);
  const groups = [...bases.entries()].sort((a, b) => a[0] - b[0]);

  // Spread the discount over the VAT groups by value; the last group takes the rounding remainder so the shares add up exactly.
  let allocated = 0;
  const vatGroups: VatGroup[] = groups.map(([rate, base], i) => {
    const share = i === groups.length - 1 ? discountAmount - allocated : subtotal > 0 ? Math.round((discountAmount * base) / subtotal) : 0;
    allocated += share;
    const net = base - share;
    return { rate, base: net, amount: Math.round((net * rate) / 100) };
  });

  const totalVat = vatGroups.reduce((s, g) => s + g.amount, 0);
  return { subtotal, discountAmount, discountPercent, vatGroups, totalVat, total: subtotal - discountAmount + totalVat };
}
