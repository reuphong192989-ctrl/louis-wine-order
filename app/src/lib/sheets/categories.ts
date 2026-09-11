import { randomUUID } from "crypto";
import { appendRow, deleteRow, readAllRows, updateRow, cell } from "./core";

const TAB = "Categories";
const HEADERS = ["id", "slug", "name", "sortOrder"];

export type Category = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

function decode(values: Record<string, string>): Category {
  return {
    id: values.id,
    slug: values.slug,
    name: values.name,
    sortOrder: cell.toInt(values.sortOrder),
  };
}

export async function listCategories(): Promise<Category[]> {
  const rows = await readAllRows(TAB);
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
  const category: Category = { id: randomUUID(), slug: input.slug, name: input.name, sortOrder: input.sortOrder };
  await appendRow(TAB, HEADERS, {
    id: category.id,
    slug: category.slug,
    name: category.name,
    sortOrder: cell.int(category.sortOrder),
  });
  return category;
}

export async function updateCategory(
  id: string,
  patch: { name?: string; sortOrder?: number }
): Promise<Category | null> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;
  const current = decode(row.values);
  const next: Category = {
    ...current,
    name: patch.name ?? current.name,
    sortOrder: patch.sortOrder ?? current.sortOrder,
  };
  await updateRow(TAB, row.rowNumber, HEADERS, {
    id: next.id,
    slug: next.slug,
    name: next.name,
    sortOrder: cell.int(next.sortOrder),
  });
  return next;
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
