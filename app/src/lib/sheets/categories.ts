import { randomUUID } from "crypto";
import { appendRow, batchUpdateRows, deleteRow, readAllRows, readAllRowsCached, updateRow, cell } from "./core";

const TAB = "Categories";
// nameEn / nameRu: optional translations for foreign guests (empty = built-in dictionary, then Vietnamese).
// vatRate: % applied to this category's items on a cashier-printed bill (internal use only, not an e-invoice).
// returnable: guests may hand back unused, untouched units (unopened beer/wine, cigars,
// cold towels) before paying — "true"/"false"; empty = guessed from the name (see below).
const HEADERS = ["id", "slug", "name", "sortOrder", "nameEn", "nameRu", "vatRate", "returnable"];

const DEFAULT_VAT_RATE = 8;

// Until a manager sets the flag explicitly, drinks/tobacco/towels are returnable and food is not.
const RETURNABLE_BY_NAME = /bia|rượu|vang|nước|đồ uống|cigar|xì gà|thuốc|khăn/i;
function defaultReturnable(name: string): boolean {
  return RETURNABLE_BY_NAME.test(name);
}

export type Category = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  nameEn: string | null;
  nameRu: string | null;
  vatRate: number;
  returnable: boolean;
};

function decode(values: Record<string, string>): Category {
  return {
    id: values.id,
    slug: values.slug,
    name: values.name,
    sortOrder: cell.toInt(values.sortOrder),
    nameEn: cell.strOrNull(values.nameEn ?? ""),
    nameRu: cell.strOrNull(values.nameRu ?? ""),
    vatRate: values.vatRate === "" || values.vatRate == null ? DEFAULT_VAT_RATE : cell.toInt(values.vatRate),
    returnable: values.returnable === "true" ? true : values.returnable === "false" ? false : defaultReturnable(values.name),
  };
}

// Menu changes are rare; a 10s shared read keeps customer phones (menu poll every 20s) off the Sheets quota.
const LIST_TTL_MS = 10_000;

export async function listCategories(): Promise<Category[]> {
  const rows = await readAllRowsCached(TAB, LIST_TTL_MS);
  return rows.map((r) => decode(r.values)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function findCategoryBySlug(slug: string): Promise<Category | null> {
  const all = await listCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function findCategoryById(id: string): Promise<Category | null> {
  const all = await listCategories();
  return all.find((c) => c.id === id) ?? null;
}

export async function createCategory(input: { name: string; slug: string; sortOrder: number }): Promise<Category> {
  const category: Category = {
    id: randomUUID(),
    slug: input.slug,
    name: input.name,
    sortOrder: input.sortOrder,
    nameEn: null,
    nameRu: null,
    vatRate: DEFAULT_VAT_RATE,
    returnable: defaultReturnable(input.name),
  };
  await appendRow(TAB, HEADERS, {
    id: category.id,
    slug: category.slug,
    name: category.name,
    sortOrder: cell.int(category.sortOrder),
    nameEn: "",
    nameRu: "",
    vatRate: cell.int(category.vatRate),
    returnable: "",
  });
  return category;
}

export async function updateCategory(
  id: string,
  patch: { name?: string; sortOrder?: number; nameEn?: string | null; nameRu?: string | null; vatRate?: number; returnable?: boolean }
): Promise<Category | null> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;
  const current = decode(row.values);
  const next: Category = {
    ...current,
    name: patch.name ?? current.name,
    sortOrder: patch.sortOrder ?? current.sortOrder,
    nameEn: patch.nameEn === undefined ? current.nameEn : patch.nameEn || null,
    nameRu: patch.nameRu === undefined ? current.nameRu : patch.nameRu || null,
    vatRate: patch.vatRate ?? current.vatRate,
    returnable: patch.returnable ?? current.returnable,
  };
  await updateRow(TAB, row.rowNumber, HEADERS, {
    id: next.id,
    slug: next.slug,
    name: next.name,
    sortOrder: cell.int(next.sortOrder),
    nameEn: cell.str(next.nameEn),
    nameRu: cell.str(next.nameRu),
    vatRate: cell.int(next.vatRate),
    // Keep "" (name-based default) until someone actually changes the flag.
    returnable: patch.returnable === undefined ? row.values.returnable ?? "" : cell.bool(next.returnable),
  });
  return next;
}

/** Reassigns sortOrder (0, 1, 2, …) for every category to match `orderedIds`, in one Sheets API call. */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const rows = await readAllRows(TAB);
  const rowsById = new Map(rows.map((r) => [r.values.id, r]));

  const updates: { rowNumber: number; record: Record<string, string> }[] = [];
  orderedIds.forEach((id, index) => {
    const row = rowsById.get(id);
    if (!row) return;
    const category = decode(row.values);
    if (category.sortOrder === index) return;
    updates.push({
      rowNumber: row.rowNumber,
      // Keep every stored column (translations included) — only the position changes.
      record: { ...row.values, sortOrder: cell.int(index) },
    });
  });

  await batchUpdateRows(TAB, HEADERS, updates);
}

export async function deleteCategory(id: string): Promise<boolean> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return false;
  await deleteRow(TAB, row.rowNumber);
  return true;
}

export const CATEGORIES_TAB = TAB;
export const CATEGORIES_HEADERS = HEADERS;
