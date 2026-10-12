/**
 * Plans how the owner's master list (src/data/book1-menu.json, from Book1.xlsx) is applied to the live menu.
 * Pure — no DB access — so the plan can be previewed ("xem trước") and unit-tested before anything is written.
 *
 * What it does:
 *  - dishes are matched by name (accents/case/brackets ignored);
 *  - for a matched dish it sets only the *overrides* that differ from its category: VAT %, bill section, unit;
 *  - dishes missing from the menu are proposed as new items;
 *  - price differences are only reported — prices are never changed here;
 *  - dishes that are on the menu but not in the list are left untouched.
 */
import type { BillGroup } from "./bill-math";
import { formatVnd } from "./format";

export type BookRow = { group: BillGroup; name: string; unit: string; price: number | null; vat: number; note: string };
export type ItemLite = { id: string; categoryId: string; name: string; priceValue: number | null; vatRate: number | null; group: BillGroup | null; unit: string | null };
export type CatLite = { id: string; name: string; vatRate: number; group: BillGroup };

export type Overrides = { vatRate: number | null; group: BillGroup | null; unit: string | null };
export type Change = { itemId: string; name: string; category: string; before: Overrides; after: Overrides };
export type Create = {
  name: string;
  categoryId: string;
  categoryName: string;
  priceValue: number | null;
  priceText: string;
  after: Overrides;
};
export type Plan = {
  updates: Change[];
  creates: Create[];
  /** New dishes with no suitable category to put them in — add the category first. */
  noCategory: BookRow[];
  /** Same dish, different price — reported only, never applied. */
  priceDiffs: { name: string; current: number; book: number }[];
  alreadyUpToDate: number;
  /** On the menu but not in the list: left exactly as they are. */
  notInBook: number;
  bookCount: number;
};

/** Accent/case-insensitive key for matching names ("Bia Heineken Bạc Cao" ≈ "bia heineken bac cao"; "(RV127)" ignored). */
export function normName(s: string): string {
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "Phần" is the default on the bill, so it is stored as empty; other units (Chai, Lon, Kg…) are kept as written. */
export function normalizeUnit(unit: string): string | null {
  const u = unit.trim();
  return u === "" || /^phần$/i.test(u) ? null : u;
}

function overridesFor(row: BookRow, cat: CatLite): Overrides {
  return {
    vatRate: row.vat === cat.vatRate ? null : row.vat,
    group: row.group === cat.group ? null : row.group,
    unit: normalizeUnit(row.unit),
  };
}
const same = (a: Overrides, b: Overrides) => a.vatRate === b.vatRate && a.group === b.group && a.unit === b.unit;

/** Which category a brand-new dish goes into, by bill section. */
function categoryForNew(group: BillGroup, cats: CatLite[]): CatLite | null {
  const byName = (re: RegExp) => cats.find((c) => c.group === group && re.test(c.name));
  const preferred =
    group === "DRINK" ? byName(/nước ngọt|giải khát/i) : group === "OTHER" ? byName(/^khác$/i) : byName(/^khác$|khai vị/i);
  return preferred ?? cats.find((c) => c.group === group) ?? null;
}

export function planImport(book: BookRow[], items: ItemLite[], cats: CatLite[]): Plan {
  const catById = new Map(cats.map((c) => [c.id, c]));
  const byName = new Map<string, ItemLite[]>();
  for (const it of items) {
    const k = normName(it.name);
    byName.set(k, [...(byName.get(k) ?? []), it]);
  }

  const plan: Plan = { updates: [], creates: [], noCategory: [], priceDiffs: [], alreadyUpToDate: 0, notInBook: 0, bookCount: book.length };
  const matchedIds = new Set<string>();
  const seenNew = new Set<string>();

  for (const row of book) {
    const key = normName(row.name);
    const hits = byName.get(key);
    if (!hits) {
      if (seenNew.has(key)) continue; // duplicate row in the list
      seenNew.add(key);
      const cat = categoryForNew(row.group, cats);
      if (!cat) {
        plan.noCategory.push(row);
        continue;
      }
      plan.creates.push({
        name: row.name,
        categoryId: cat.id,
        categoryName: cat.name,
        priceValue: row.price,
        priceText: row.price != null ? formatVnd(row.price) : row.note || "Thời giá",
        after: overridesFor(row, cat),
      });
      continue;
    }
    for (const it of hits) {
      matchedIds.add(it.id);
      const cat = catById.get(it.categoryId);
      if (!cat) continue;
      if (row.price != null && it.priceValue != null && row.price !== it.priceValue) {
        plan.priceDiffs.push({ name: it.name, current: it.priceValue, book: row.price });
      }
      const before: Overrides = { vatRate: it.vatRate, group: it.group, unit: it.unit };
      const after = overridesFor(row, cat);
      if (same(before, after)) plan.alreadyUpToDate++;
      else plan.updates.push({ itemId: it.id, name: it.name, category: cat.name, before, after });
    }
  }
  plan.notInBook = items.filter((it) => !matchedIds.has(it.id)).length;
  return plan;
}
