/**
 * Checks for the Book1 import planner. Run: npm run check:import
 */
import assert from "node:assert/strict";
import { normName, normalizeUnit, planImport, type BookRow, type CatLite, type ItemLite } from "../src/lib/menu-import-plan";

const cats: CatLite[] = [
  { id: "rau", name: "Rau", vatRate: 8, group: "FOOD" },
  { id: "bia", name: "Bia", vatRate: 10, group: "DRINK" },
  { id: "ngot", name: "Nước Ngọt", vatRate: 10, group: "DRINK" },
  { id: "khac", name: "Khác", vatRate: 8, group: "OTHER" },
];
const item = (id: string, categoryId: string, name: string, priceValue: number | null): ItemLite => ({ id, categoryId, name, priceValue, vatRate: null, group: null, unit: null });
const items: ItemLite[] = [
  item("1", "rau", "Rau muống xào tỏi", 88_000),
  item("2", "bia", "Bia Heineken Bạc Cao", 35_000),
  item("3", "ngot", "Pepsi", 20_000),
  item("4", "ngot", "Nước Suối", 15_000),
  item("5", "khac", "Cơm trắng", 50_000),
  item("6", "khac", "Khăn lạnh", 5_000),
  item("7", "rau", "Món chỉ có trên menu", 1_000),
];
const book: BookRow[] = [
  { group: "FOOD", name: "Rau muống xào tỏi", unit: "Phần", price: 90_000, vat: 8, note: "" }, // price differs → reported only
  { group: "DRINK", name: "bia heineken bac cao", unit: "Lon", price: 35_000, vat: 10, note: "" }, // accents/case ignored
  { group: "DRINK", name: "Pepsi", unit: "Lon", price: 20_000, vat: 10, note: "" },
  { group: "DRINK", name: "Nước Suối", unit: "Lon", price: 15_000, vat: 8, note: "" }, // 8% inside a 10% category
  { group: "FOOD", name: "Cơm trắng", unit: "Phần", price: 50_000, vat: 8, note: "" }, // food sitting in "Khác"
  { group: "OTHER", name: "Khăn lạnh", unit: "Cái", price: 5_000, vat: 8, note: "" },
  { group: "DRINK", name: "Nước chanh", unit: "Ly", price: 35_000, vat: 8, note: "" }, // new
  { group: "DRINK", name: "Nước chanh", unit: "Ly", price: 35_000, vat: 8, note: "" }, // duplicate row in the list
  { group: "FOOD", name: "Món mới chưa có giá", unit: "Phần", price: null, vat: 8, note: "Thời giá" }, // new, no price → note becomes the price text
];

assert.equal(normName("Carparo 15.5% (RV127)"), "carparo 15 5");
assert.equal(normName("Đồ Nguội & Phô Mai"), "do nguoi pho mai");
assert.equal(normalizeUnit("Phần"), null);
assert.equal(normalizeUnit(" phần "), null);
assert.equal(normalizeUnit(""), null);
assert.equal(normalizeUnit("Chai"), "Chai");

const plan = planImport(book, items, cats);
const upd = new Map(plan.updates.map((u) => [u.itemId, u]));

// Already in line with its category → nothing to do.
assert.ok(!upd.has("1"), "Rau muống: VAT/group follow the category, unit is the default");
assert.deepEqual(plan.priceDiffs, [{ name: "Rau muống xào tỏi", current: 88_000, book: 90_000 }], "price differences are reported, not applied");
// Only the unit changes for beer and Pepsi (their VAT/group already match the category).
assert.deepEqual(upd.get("2")?.after, { vatRate: null, group: null, unit: "Lon" });
assert.deepEqual(upd.get("3")?.after, { vatRate: null, group: null, unit: "Lon" });
// Nước Suối needs its own 8%.
assert.deepEqual(upd.get("4")?.after, { vatRate: 8, group: null, unit: "Lon" });
// Cơm trắng is food even though its category is "Khác"; Khăn lạnh is "Khác" like its category.
assert.deepEqual(upd.get("5")?.after, { vatRate: null, group: "FOOD", unit: null });
assert.deepEqual(upd.get("6")?.after, { vatRate: null, group: null, unit: "Cái" });
// The "before" snapshot is kept for undo.
assert.deepEqual(upd.get("4")?.before, { vatRate: null, group: null, unit: null });

// New dishes: one Nước chanh (duplicate row ignored), into "Nước Ngọt", own VAT 8%, unit Ly.
const lemon = plan.creates.find((c) => c.name === "Nước chanh");
assert.equal(plan.creates.filter((c) => c.name === "Nước chanh").length, 1);
assert.equal(lemon?.categoryId, "ngot");
assert.deepEqual(lemon?.after, { vatRate: 8, group: null, unit: "Ly" });
assert.equal(lemon?.priceValue, 35_000);
// A new dish without a price keeps the note as its price text.
const noPrice = plan.creates.find((c) => c.name === "Món mới chưa có giá");
assert.equal(noPrice?.priceValue, null);
assert.equal(noPrice?.priceText, "Thời giá");

// Dishes on the menu but not in the list are untouched and counted.
assert.equal(plan.notInBook, 1);
assert.ok(!upd.has("7"));

// A new dish whose section has no category at all is reported instead of guessed.
const noCat = planImport([{ group: "OTHER", name: "Dịch vụ lạ", unit: "Lần", price: 1, vat: 10, note: "" }], items, cats.filter((c) => c.group !== "OTHER"));
assert.equal(noCat.creates.length, 0);
assert.equal(noCat.noCategory.length, 1);

// Idempotent: apply the plan, plan again → nothing left to change.
for (const u of plan.updates) {
  const it = items.find((i) => i.id === u.itemId)!;
  Object.assign(it, u.after);
}
const again = planImport(book, items, cats);
assert.equal(again.updates.length, 0, "second run changes nothing");
assert.equal(again.alreadyUpToDate, 6);

console.log("menu-import checks passed");
