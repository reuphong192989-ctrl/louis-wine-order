/**
 * Regression checks for the bill arithmetic (discount %, VAT after discount). Run: npm run check:bill
 */
import assert from "node:assert/strict";
import { computeBill } from "../src/lib/bill-math";

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

// 10% discount: VAT is charged on the discounted price of each group.
{
  const t = computeBill(mixed, { type: "percent", value: 10 });
  assert.equal(t.discountAmount, 150_000);
  assert.equal(t.discountPercent, 10);
  assert.deepEqual(t.vatGroups, [{ rate: 8, base: 900_000, amount: 72_000 }, { rate: 10, base: 450_000, amount: 45_000 }]);
  assert.equal(t.totalVat, 117_000);
  assert.equal(t.total, 1_467_000); // 1,500,000 − 150,000 + 117,000
}

// Same discount typed as an amount gives the same totals (and no percent).
{
  const t = computeBill(mixed, { type: "amount", value: 150_000 });
  assert.equal(t.total, 1_467_000);
  assert.equal(t.discountPercent, null);
}

// 100% discount → everything zero. More than 100% / more than the bill → clamped.
{
  const t = computeBill(mixed, { type: "percent", value: 100 });
  assert.equal(t.total, 0);
  assert.equal(t.totalVat, 0);
  assert.equal(computeBill(mixed, { type: "percent", value: 250 }).total, 0);
  const big = computeBill(mixed, { type: "amount", value: 99_000_000 });
  assert.equal(big.discountAmount, 1_500_000);
  assert.equal(big.total, 0);
}

// Rounding: the group shares always add up to exactly the discount (no lost or invented dong).
{
  const lines = [L(333_333, 8), L(333_333, 10), L(333_334, 0)];
  for (const value of [1, 7, 99_999, 100_000, 333_333, 999_999]) {
    const t = computeBill(lines, { type: "amount", value });
    assert.equal(t.vatGroups.reduce((s, g) => s + g.base, 0), t.subtotal - t.discountAmount, `bases add up for discount ${value}`);
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

// A single VAT group takes the whole discount.
{
  const t = computeBill([L(200_000, 8)], { type: "percent", value: 5 });
  assert.equal(t.discountAmount, 10_000);
  assert.deepEqual(t.vatGroups, [{ rate: 8, base: 190_000, amount: 15_200 }]);
  assert.equal(t.total, 205_200);
}

console.log("bill-math checks passed");
