import { randomUUID } from "crypto";
import { appendRow, batchUpdateRows, deleteRow, readAllRows, readAllRowsCached, updateRow, cell } from "./core";
import type { BillGroup } from "../bill-math";

const TAB = "MenuItems";
const HEADERS = [
  "id",
  "categoryId",
  "name",
  "note",
  "priceText",
  "priceValue",
  "imageUrl",
  "isHighlight",
  "isFeaturedSpecial",
  "available",
  "sortOrder",
  // Optional translations for foreign guests (website + table menu). Empty = use the
  // built-in dictionary (src/lib/site/menu-i18n.ts), then Vietnamese.
  "nameEn",
  "noteEn",
  "nameRu",
  "noteRu",
  // Bill overrides (empty = follow the category's VAT / group; unit empty = "phần"). Appended Oct 2026.
  "vatRate",
  "group",
  "unit",
];

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  note: string | null;
  priceText: string;
  priceValue: number | null;
  imageUrl: string | null;
  isHighlight: boolean;
  isFeaturedSpecial: boolean;
  available: boolean;
  sortOrder: number;
  nameEn: string | null;
  noteEn: string | null;
  nameRu: string | null;
  noteRu: string | null;
  /** VAT % for this dish; null = use the category's rate. */
  vatRate: number | null;
  /** Bill section for this dish; null = use the category's group. */
  group: BillGroup | null;
  /** Unit printed on the bill (Chai, Lon, Kg…); null = "phần". */
  unit: string | null;
};

function decode(values: Record<string, string>): MenuItem {
  return {
    id: values.id,
    categoryId: values.categoryId,
    name: values.name,
    note: cell.strOrNull(values.note),
    priceText: values.priceText,
    priceValue: cell.numOrNull(values.priceValue),
    imageUrl: cell.strOrNull(values.imageUrl),
    isHighlight: cell.toBool(values.isHighlight),
    isFeaturedSpecial: cell.toBool(values.isFeaturedSpecial),
    available: values.available === "" ? true : cell.toBool(values.available),
    sortOrder: cell.toInt(values.sortOrder),
    nameEn: cell.strOrNull(values.nameEn ?? ""),
    noteEn: cell.strOrNull(values.noteEn ?? ""),
    nameRu: cell.strOrNull(values.nameRu ?? ""),
    noteRu: cell.strOrNull(values.noteRu ?? ""),
    vatRate: values.vatRate === "" || values.vatRate == null || Number.isNaN(Number(values.vatRate)) ? null : cell.toInt(values.vatRate),
    group: values.group === "FOOD" || values.group === "DRINK" || values.group === "OTHER" ? values.group : null,
    unit: cell.strOrNull(values.unit ?? ""),
  };
}

function encode(item: MenuItem): Record<string, string> {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    note: cell.str(item.note),
    priceText: item.priceText,
    priceValue: cell.num(item.priceValue),
    imageUrl: cell.str(item.imageUrl),
    isHighlight: cell.bool(item.isHighlight),
    isFeaturedSpecial: cell.bool(item.isFeaturedSpecial),
    available: cell.bool(item.available),
    sortOrder: cell.int(item.sortOrder),
    nameEn: cell.str(item.nameEn),
    noteEn: cell.str(item.noteEn),
    nameRu: cell.str(item.nameRu),
    noteRu: cell.str(item.noteRu),
    vatRate: item.vatRate === null ? "" : String(item.vatRate),
    group: item.group ?? "",
    unit: cell.str(item.unit),
  };
}

// Menu changes are rare; a 10s shared read keeps customer phones (menu poll every 20s) off the Sheets quota.
const LIST_TTL_MS = 10_000;

export async function listAllMenuItems(): Promise<MenuItem[]> {
  const rows = await readAllRowsCached(TAB, LIST_TTL_MS);
  return rows.map((r) => decode(r.values)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listMenuItemsByCategory(categoryId: string, availableOnly = false): Promise<MenuItem[]> {
  const all = await listAllMenuItems();
  return all.filter((it) => it.categoryId === categoryId && (!availableOnly || it.available));
}

export async function countItemsInCategory(categoryId: string): Promise<number> {
  const all = await listAllMenuItems();
  return all.filter((it) => it.categoryId === categoryId).length;
}

export async function findMenuItemById(id: string): Promise<MenuItem | null> {
  const all = await listAllMenuItems();
  return all.find((it) => it.id === id) ?? null;
}

export async function findMenuItemsByIds(ids: string[]): Promise<Map<string, MenuItem>> {
  const set = new Set(ids);
  const all = await listAllMenuItems();
  const map = new Map<string, MenuItem>();
  for (const it of all) if (set.has(it.id)) map.set(it.id, it);
  return map;
}

export async function nextSortOrderInCategory(categoryId: string): Promise<number> {
  const items = await listMenuItemsByCategory(categoryId);
  return items.reduce((max, it) => Math.max(max, it.sortOrder), -1) + 1;
}

/** `id` is only passed when the caller has to know it beforehand (e.g. to write an undo log first). */
export async function createMenuItem(input: Omit<MenuItem, "id">, id: string = randomUUID()): Promise<MenuItem> {
  const item: MenuItem = { ...input, id };
  await appendRow(TAB, HEADERS, encode(item));
  return item;
}

/** Rewrites several existing dishes (full rows) in one write — used by the Book1 import and its undo. */
export async function updateMenuItemsBatch(items: MenuItem[]): Promise<void> {
  if (items.length === 0) return;
  const rows = await readAllRows(TAB);
  const rowById = new Map(rows.map((r) => [r.values.id, r.rowNumber]));
  const updates = items.flatMap((it) => {
    const rowNumber = rowById.get(it.id);
    return rowNumber === undefined ? [] : [{ rowNumber, record: encode(it) }];
  });
  await batchUpdateRows(TAB, HEADERS, updates);
}

export async function updateMenuItem(id: string, input: Omit<MenuItem, "id">): Promise<MenuItem | null> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;
  const next: MenuItem = { ...input, id };
  await updateRow(TAB, row.rowNumber, HEADERS, encode(next));
  return next;
}

/**
 * Reassigns sortOrder (0, 1, 2, …) for every item in a category to match `orderedIds`.
 * Used by the admin drag/number reorder UI — one Sheets API call regardless of item count.
 */
export async function reorderItemsInCategory(categoryId: string, orderedIds: string[]): Promise<void> {
  const rows = await readAllRows(TAB);
  const rowsById = new Map(rows.map((r) => [r.values.id, r]));

  const updates: { rowNumber: number; record: Record<string, string> }[] = [];
  orderedIds.forEach((id, index) => {
    const row = rowsById.get(id);
    if (!row || row.values.categoryId !== categoryId) return;
    const item = decode(row.values);
    if (item.sortOrder === index) return;
    updates.push({ rowNumber: row.rowNumber, record: encode({ ...item, sortOrder: index }) });
  });

  await batchUpdateRows(TAB, HEADERS, updates);
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return false;
  await deleteRow(TAB, row.rowNumber);
  return true;
}

export const MENU_ITEMS_TAB = TAB;
export const MENU_ITEMS_HEADERS = HEADERS;
