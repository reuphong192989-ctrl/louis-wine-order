import { randomUUID } from "crypto";
import { appendRows, ensureTab, readAllRows } from "./core";
import { deleteMenuItem, listAllMenuItems, createMenuItem, nextSortOrderInCategory, updateMenuItemsBatch, type MenuItem } from "./menuItems";
import { listCategories } from "./categories";
import { planImport, type BookRow, type Overrides, type Plan } from "../menu-import-plan";
import book from "../../data/book1-menu.json";

const TAB = "MenuImportLog";
// One row per dish touched by an import run, holding what it looked like before — that is what "Hoàn tác" restores.
// op: "update" (before = the dish's previous overrides) | "create" (dish was added) | "undo" (marks the run as reverted).
const HEADERS = ["runId", "at", "by", "op", "itemId", "name", "before"];

export type ImportRun = { runId: string; at: string; by: string; updated: number; created: number; undone: boolean };

export async function buildPlan(): Promise<Plan> {
  const [items, categories] = await Promise.all([listAllMenuItems(), listCategories()]);
  return planImport(
    book as BookRow[],
    items.map((i) => ({ id: i.id, categoryId: i.categoryId, name: i.name, priceValue: i.priceValue, vatRate: i.vatRate, group: i.group, unit: i.unit })),
    categories.map((c) => ({ id: c.id, name: c.name, vatRate: c.vatRate, group: c.group })),
  );
}

/** Most recent import run (and whether it was already undone), for the admin screen. */
export async function lastImportRun(): Promise<ImportRun | null> {
  const rows = await readLogRows();
  const runs = new Map<string, ImportRun>();
  for (const r of rows) {
    const run = runs.get(r.runId) ?? { runId: r.runId, at: r.at, by: r.by, updated: 0, created: 0, undone: false };
    if (r.op === "update") run.updated++;
    else if (r.op === "create") run.created++;
    else if (r.op === "undo") run.undone = true;
    runs.set(r.runId, run);
  }
  const all = [...runs.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
  return all[0] ?? null;
}

type LogRow = { runId: string; at: string; by: string; op: string; itemId: string; name: string; before: string };
async function readLogRows(): Promise<LogRow[]> {
  const rows = await readAllRows(TAB).catch(() => []); // tab doesn't exist until the first run
  return rows.map((r) => r.values as unknown as LogRow).filter((r) => r.runId);
}

/**
 * Applies the current plan. Undo information is written *before* any dish is changed, so a failure halfway
 * can still be reverted with undoLastImport(). Prices are never touched; nothing is ever deleted.
 */
export async function applyImport(by: string): Promise<{ runId: string; updated: number; created: number }> {
  const plan = await buildPlan();
  if (plan.updates.length === 0 && plan.creates.length === 0) return { runId: "", updated: 0, created: 0 };

  const runId = randomUUID();
  const at = new Date().toISOString();
  const newIds = plan.creates.map(() => randomUUID());

  await ensureTab(TAB, HEADERS);
  await appendRows(TAB, HEADERS, [
    ...plan.updates.map((u) => ({ runId, at, by, op: "update", itemId: u.itemId, name: u.name, before: JSON.stringify(u.before) })),
    ...plan.creates.map((c, i) => ({ runId, at, by, op: "create", itemId: newIds[i], name: c.name, before: "" })),
  ]);

  const items = await listAllMenuItems();
  const byId = new Map(items.map((i) => [i.id, i]));
  await updateMenuItemsBatch(
    plan.updates.flatMap((u) => {
      const it = byId.get(u.itemId);
      return it ? [{ ...it, ...u.after }] : [];
    }),
  );

  for (let i = 0; i < plan.creates.length; i++) {
    const c = plan.creates[i];
    await createMenuItem(
      {
        categoryId: c.categoryId,
        name: c.name,
        note: null,
        priceText: c.priceText,
        priceValue: c.priceValue,
        imageUrl: null,
        isHighlight: false,
        isFeaturedSpecial: false,
        available: true,
        sortOrder: await nextSortOrderInCategory(c.categoryId),
        nameEn: null,
        noteEn: null,
        nameRu: null,
        noteRu: null,
        ...c.after,
      },
      newIds[i],
    );
  }
  return { runId, updated: plan.updates.length, created: plan.creates.length };
}

/** Reverts the most recent run that hasn't been undone: restores previous overrides, removes dishes it added. */
export async function undoLastImport(by: string): Promise<{ runId: string; restored: number; removed: number } | null> {
  const rows = await readLogRows();
  const undone = new Set(rows.filter((r) => r.op === "undo").map((r) => r.runId));
  const runs = [...new Set(rows.filter((r) => r.op !== "undo").map((r) => r.runId))]
    .filter((id) => !undone.has(id))
    .map((id) => ({ id, at: rows.find((r) => r.runId === id)!.at }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const last = runs[0];
  if (!last) return null;

  const mine = rows.filter((r) => r.runId === last.id);
  const items = await listAllMenuItems();
  const byId = new Map(items.map((i) => [i.id, i]));

  const restore: MenuItem[] = [];
  for (const r of mine.filter((x) => x.op === "update")) {
    const it = byId.get(r.itemId);
    if (!it) continue;
    const before = JSON.parse(r.before) as Overrides;
    restore.push({ ...it, vatRate: before.vatRate, group: before.group, unit: before.unit });
  }
  await updateMenuItemsBatch(restore);

  let removed = 0;
  for (const r of mine.filter((x) => x.op === "create")) {
    if (byId.has(r.itemId) && (await deleteMenuItem(r.itemId))) removed++;
  }

  await appendRows(TAB, HEADERS, [{ runId: last.id, at: new Date().toISOString(), by, op: "undo", itemId: "", name: "", before: "" }]);
  return { runId: last.id, restored: restore.length, removed };
}

export const MENU_IMPORT_LOG_TAB = TAB;
