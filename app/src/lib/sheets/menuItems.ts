import { randomUUID } from "crypto";
import { appendRow, deleteRow, readAllRows, updateRow, cell } from "./core";

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
  "available",
  "sortOrder",
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
  available: boolean;
  sortOrder: number;
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
    available: values.available === "" ? true : cell.toBool(values.available),
    sortOrder: cell.toInt(values.sortOrder),
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
    available: cell.bool(item.available),
    sortOrder: cell.int(item.sortOrder),
  };
}

export async function listAllMenuItems(): Promise<MenuItem[]> {
  const rows = await readAllRows(TAB);
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

export async function createMenuItem(input: Omit<MenuItem, "id">): Promise<MenuItem> {
  const item: MenuItem = { ...input, id: randomUUID() };
  await appendRow(TAB, HEADERS, encode(item));
  return item;
}

export async function updateMenuItem(id: string, input: Omit<MenuItem, "id">): Promise<MenuItem | null> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;
  const next: MenuItem = { ...input, id };
  await updateRow(TAB, row.rowNumber, HEADERS, encode(next));
  return next;
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
