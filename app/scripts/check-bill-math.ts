/**
 * Regression checks for the bill arithmetic (discount %, VAT on the pre-discount price, "Mời" comps).
 * Run: npm run check:bill
 */
import assert from "node:assert/strict";
import { applyComp, billLineCompKey, computeBill } from "../src/lib/bill-math";

const L = (lineTotal: number, vatRate: number) => ({ lineTotal, vatRate });
const mixed = [L(1_000_000, 8), L(500_000, 10)];

// No discount: VAT per group on the full amount.
{
  const t = computeBill(mixed, null);
  assert.equal(t.subtotal, 1_500_000);
  assert.deepEqual(t.vatGroups, [{ rate: 8, base: 1_000_000, amount: 80_000 }, { rate: 10, base: 500_000, amount: 50_000 }]);
  assert.equal(t.totalVat, 130_000);
  assert.equal(t.total, 1_630_000);
  assert.equal(t.discountAmount, 0);
  assert.equal(t.discountPercent, null);
}

// 10% discount: VAT is still charged on each group's full (pre-discount) price; the discount
// is a separate line taken off the total afterwards, so totalVat is unchanged from the no-discount case.
{
  const t = computeBill(mixed, { type: "percent", value: 10 });
  assert.equal(t.discountAmount, 150_000);
  assert.equal(t.discountPercent, 10);
  assert.deepEqual(t.vatGroups, [{ rate: 8, base: 1_000_000, amount: 80_000 }, { rate: 10, base: 500_000, amount: 50_000 }]);
  assert.equal(t.totalVat, 130_000);
  assert.equal(t.total, 1_480_000); // 1,500,000 − 150,000 + 130,000
}

// Same discount typed as an amount gives the same totals (and no percent).
{
  const t = computeBill(mixed, { type: "amount", value: 150_000 });
  assert.equal(t.total, 1_480_000);
  assert.equal(t.discountPercent, null);
}

// 100% discount (a fully "mời" table) → the subtotal is wiped out but VAT, charged on the
// original price, is NOT: the house still owes tax on what the table was worth. More than
// 100% / more than the bill → clamped to the subtotal, same result.
{
  const t = computeBill(mixed, { type: "percent", value: 100 });
  assert.equal(t.discountAmount, 1_500_000);
  assert.equal(t.totalVat, 130_000);
  assert.equal(t.total, 130_000);
  assert.equal(computeBill(mixed, { type: "percent", value: 250 }).total, 130_000);
  const big = computeBill(mixed, { type: "amount", value: 99_000_000 });
  assert.equal(big.discountAmount, 1_500_000);
  assert.equal(big.total, 130_000);
}

// Rounding: VAT group bases always add up to exactly the subtotal (discount doesn't touch them).
{
  const lines = [L(333_333, 8), L(333_333, 10), L(333_334, 0)];
  for (const value of [1, 7, 99_999, 100_000, 333_333, 999_999]) {
    const t = computeBill(lines, { type: "amount", value });
    assert.equal(t.vatGroups.reduce((s, g) => s + g.base, 0), t.subtotal, `bases add up to the full subtotal for discount ${value}`);
    assert.equal(t.total, t.subtotal - t.discountAmount + t.totalVat);
  }
  const pct = computeBill(lines, { type: "percent", value: 12.5 });
  assert.equal(pct.discountAmount, Math.round((1_000_000 * 12.5) / 100));
}

// Junk discounts are ignored; an empty bill is all zeros.
{
  for (const d of [{ type: "amount" as const, value: -5 }, { type: "percent" as const, value: NaN }, { type: "amount" as const, value: 0 }]) {
    assert.equal(computeBill(mixed, d).total, 1_630_000);
  }
  const empty = computeBill([], { type: "percent", value: 10 });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.vatGroups, []);
}

// A single VAT group: VAT is charged on the full price, discount comes off the total after.
{
  const t = computeBill([L(200_000, 8)], { type: "percent", value: 5 });
  assert.equal(t.discountAmount, 10_000);
  assert.deepEqual(t.vatGroups, [{ rate: 8, base: 200_000, amount: 16_000 }]);
  assert.equal(t.total, 206_000); // 200,000 − 10,000 + 16,000
}

// "Mời" (comp): billLineCompKey identifies a printed row; applyComp zeroes out comped lines and reports
// how much was waived, leaving other lines untouched.
{
  const bo = { name: "Bò một nắng", unitPrice: 268_000, vatRate: 8, lineTotal: 536_000, qty: 2 };
  const cafe = { name: "Cà phê sữa", unitPrice: 35_000, vatRate: 10, lineTotal: 70_000, qty: 2 };
  assert.equal(billLineCompKey(bo), "Bò một nắng|268000|8");
  assert.notEqual(billLineCompKey(bo), billLineCompKey(cafe));
  // Same name/price/VAT but from a different round is still the same printed row/key.
  const boOtherRound = { ...bo, lineTotal: 268_000, qty: 1 };
  assert.equal(billLineCompKey(bo), billLineCompKey(boOtherRound));

  // No comps selected: nothing changes, same array reference back (no needless copy).
  const original = [bo, cafe];
  const none = applyComp(original, new Set());
  assert.equal(none.lines, original);
  assert.equal(none.compAmount, 0);

  // Comp the beef: its lineTotal is zeroed, the coffee is untouched, compAmount is what was waived.
  const comped = applyComp([bo, cafe], new Set([billLineCompKey(bo)]));
  assert.equal(comped.compAmount, 536_000);
  assert.deepEqual(comped.lines, [{ ...bo, lineTotal: 0 }, cafe]);

  // End-to-end: feeding the comped lines into computeBill charges no VAT and gives no discount-base
  // credit for the comped dish — VAT/discount only apply to what's actually sold.
  const totals = computeBill(comped.lines, { type: "percent", value: 10 });
  assert.equal(totals.subtotal, 70_000); // just the coffee
  assert.equal(totals.discountAmount, 7_000); // 10% of 70,000, not 10% of the original 606,000
  // The beef's 8% group still shows up (it still has a VAT rate), but contributes nothing.
  assert.deepEqual(totals.vatGroups, [{ rate: 8, base: 0, amount: 0 }, { rate: 10, base: 70_000, amount: 7_000 }]);
  assert.equal(totals.totalVat, 7_000);
  assert.equal(totals.total, 70_000 - 7_000 + 7_000);
}

console.log("bill-math checks passed");
