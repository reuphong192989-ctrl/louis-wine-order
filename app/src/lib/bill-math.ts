/**
 * Bill arithmetic shared by the server (finalize) and the cashier screen (live total), so the number on the
 * screen is always the number printed. Pure — no server/DB imports.
 *
 * Prices are VAT-exclusive: total = subtotal − discount + VAT. VAT is charged on each VAT group's full
 * (pre-discount) price; the discount is a separate line taken off the total afterwards. (Changed 22/10 at
 * the chairman's request — previously VAT was charged on the discounted price; see PROGRESS.md.)
 */

export type BillGroup = "FOOD" | "DRINK" | "OTHER";
export const BILL_GROUPS: readonly BillGroup[] = ["FOOD", "DRINK", "OTHER"];
export const BILL_GROUP_LABEL: Record<BillGroup, string> = { FOOD: "ĐỒ ĂN", DRINK: "ĐỒ UỐNG", OTHER: "KHÁC" };

/** `base` is the group's full pre-discount price — the amount VAT is charged on. */
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

  // VAT on each group's full price — the discount does not reduce the VAT base, it is subtracted
  // from the total afterwards (see the file comment above for why).
  const vatGroups: VatGroup[] = groups.map(([rate, base]) => ({ rate, base, amount: Math.round((base * rate) / 100) }));

  const totalVat = vatGroups.reduce((s, g) => s + g.amount, 0);
  return { subtotal, discountAmount, discountPercent, vatGroups, totalVat, total: subtotal - discountAmount + totalVat };
}

/**
 * Identity of a printed bill row, matching how it's grouped on screen/paper (mergeBillLines groups the
 * same dish/price/VAT-rate together into one row even if it came from several rounds). "Mời" (complimentary
 * — a manager waives the charge) is selected per printed row, so this key is also how a comp selection is
 * matched back to the raw order lines it covers.
 */
export function billLineCompKey(l: { name: string; unitPrice: number; vatRate: number }): string {
  return `${l.name}|${l.unitPrice}|${l.vatRate}`;
}

/**
 * Zeroes the price of every line whose row is marked "Mời" (served, not charged — a manager's call) and
 * reports how much was waived. The dish stays in the returned lines at qty intact so the bill still prints
 * it (for food-cost accountability); only its contribution to subtotal/discount-base/VAT becomes zero.
 */
export function applyComp<T extends { name: string; unitPrice: number; vatRate: number; lineTotal: number }>(
  lines: T[],
  compedKeys: ReadonlySet<string>,
): { lines: T[]; compAmount: number } {
  if (compedKeys.size === 0) return { lines, compAmount: 0 };
  let compAmount = 0;
  const out = lines.map((l) => {
    if (!compedKeys.has(billLineCompKey(l))) return l;
    compAmount += l.lineTotal;
    return { ...l, lineTotal: 0 };
  });
  return { lines: out, compAmount };
}
