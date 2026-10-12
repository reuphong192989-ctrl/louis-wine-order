/**
 * End-to-end check of the Book1 import against an in-memory stand-in for PostgreSQL: apply → bill reads the new
 * VAT/section/unit → apply again is a no-op → undo restores everything and removes what was added.
 * Run: npm run check:import-db
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:1/db"; // never connected — pg is stubbed below
process.env.DATA_BACKEND = "postgres";

const appRequire = createRequire(process.cwd() + "/package.json");
const { Pool } = appRequire("pg") as typeof import("pg");

// ---- tiny in-memory database speaking exactly the statements backend-postgres.ts issues
const tabs = new Map<string, string[]>();
let rows: { id: number; tab: string; data: Record<string, string> }[] = [];
let nextId = 1;
const run = async (text: string, params: unknown[] = []) => {
  const t = text.replace(/\s+/g, " ").trim();
  if (/^(BEGIN|COMMIT|ROLLBACK|CREATE )/i.test(t)) return { rows: [] };
  if (/^SELECT 1/i.test(t)) return { rows: [{ "?column?": 1 }] };
  if (/^SELECT headers FROM app_tabs/i.test(t)) return { rows: tabs.has(params[0] as string) ? [{ headers: tabs.get(params[0] as string) }] : [] };
  if (/^INSERT INTO app_tabs/i.test(t)) {
    const [tab, json] = params as [string, string];
    const merged = [...new Set([...(tabs.get(tab) ?? []), ...(JSON.parse(json) as string[])])];
    tabs.set(tab, merged);
    return { rows: [{ headers: merged }] };
  }
  if (/^SELECT id, data FROM app_rows/i.test(t)) return { rows: rows.filter((r) => r.tab === params[0]).map((r) => ({ id: String(r.id), data: r.data })) };
  if (/^INSERT INTO app_rows/i.test(t)) {
    for (const p of params.slice(1)) rows.push({ id: nextId++, tab: params[0] as string, data: JSON.parse(p as string) });
    return { rows: [] };
  }
  if (/^UPDATE app_rows/i.test(t)) {
    const r = rows.find((x) => x.tab === params[0] && x.id === Number(params[1]));
    if (r) r.data = { ...r.data, ...JSON.parse(params[2] as string) };
    return { rows: [] };
  }
  if (/^DELETE FROM app_rows WHERE tab = \$1 AND id = ANY/i.test(t)) {
    const ids = new Set((params[1] as number[]).map(Number));
    rows = rows.filter((r) => !(r.tab === params[0] && ids.has(r.id)));
    return { rows: [] };
  }
  throw new Error("fake db: unsupported statement: " + t.slice(0, 80));
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = Pool.prototype as any;
P.query = run;
P.connect = async () => ({ query: run, release: () => {} });

async function main() {
  const { createCategory, updateCategory } = await import("@/lib/sheets/categories");
  const { createMenuItem, listAllMenuItems } = await import("@/lib/sheets/menuItems");
  const { buildPlan, applyImport, undoLastImport, lastImportRun } = await import("@/lib/sheets/menuImport");
  const { billMetaByMenuItemId } = await import("@/lib/billing");

  // ---- seed a small live menu
  const mkCat = async (name: string, vatRate: number, group: "FOOD" | "DRINK" | "OTHER", sortOrder: number) => {
    const c = await createCategory({ name, slug: name.toLowerCase().replace(/\W+/g, "-"), sortOrder });
    await updateCategory(c.id, { vatRate, group });
    return c.id;
  };
  const rau = await mkCat("Rau", 8, "FOOD", 0);
  const ngot = await mkCat("Nước Ngọt", 10, "DRINK", 1);
  const khac = await mkCat("Khác", 8, "OTHER", 2);
  const base = { note: null, imageUrl: null, isHighlight: false, isFeaturedSpecial: false, available: true, nameEn: null, noteEn: null, nameRu: null, noteRu: null, vatRate: null, group: null, unit: null, sortOrder: 0 };
  const mk = (categoryId: string, name: string, price: number) => createMenuItem({ ...base, categoryId, name, priceText: String(price), priceValue: price });
  const suoi = await mk(ngot, "Nước Suối", 15_000);
  const pepsi = await mk(ngot, "Pepsi", 20_000);
  const com = await mk(khac, "Cơm trắng", 50_000);
  const rauMuong = await mk(rau, "Rau muống xào tỏi", 88_000);
  const extra = await mk(rau, "Món chỉ có trên menu", 1_000); // not in Book1

  const before = JSON.stringify(await listAllMenuItems());

  // ---- bill reads category values until the import sets overrides
  let meta = await billMetaByMenuItemId();
  assert.deepEqual(meta.get(suoi.id), { vatRate: 10, group: "DRINK", unit: null }, "Nước Suối follows its 10% category before the import");

  // ---- preview does not write anything
  const plan = await buildPlan();
  assert.ok(plan.updates.length >= 3 && plan.creates.length > 0);
  assert.equal(JSON.stringify(await listAllMenuItems()), before, "buildPlan() is read-only");
  assert.equal(await lastImportRun(), null);

  // ---- apply
  const res = await applyImport("owner");
  assert.ok(res.runId && res.updated === plan.updates.length && res.created === plan.creates.length);
  meta = await billMetaByMenuItemId();
  assert.deepEqual(meta.get(suoi.id), { vatRate: 8, group: "DRINK", unit: "Lon" }, "Nước Suối now 8% / Lon");
  assert.deepEqual(meta.get(pepsi.id), { vatRate: 10, group: "DRINK", unit: "Lon" });
  assert.deepEqual(meta.get(com.id), { vatRate: 8, group: "FOOD", unit: null }, "Cơm trắng is food although in Khác");
  assert.deepEqual(meta.get(rauMuong.id), { vatRate: 8, group: "FOOD", unit: null });
  const after = await listAllMenuItems();
  assert.equal(after.length, 5 + res.created);
  const lemon = after.find((i) => i.name === "Nước chanh");
  assert.ok(lemon && lemon.categoryId === ngot && lemon.vatRate === 8 && lemon.unit === "Ly" && lemon.priceValue === 35_000);
  assert.equal(after.find((i) => i.id === extra.id)?.priceValue, 1_000, "dishes not in Book1 are untouched");
  assert.equal(after.find((i) => i.id === suoi.id)?.priceValue, 15_000, "prices are never changed");
  const run1 = await lastImportRun();
  assert.equal(run1?.updated, res.updated);
  assert.equal(run1?.created, res.created);
  assert.equal(run1?.undone, false);

  // ---- applying again changes nothing
  const again = await buildPlan();
  assert.equal(again.updates.length, 0);
  assert.equal(again.creates.length, 0);
  assert.deepEqual(await applyImport("owner"), { runId: "", updated: 0, created: 0 });

  // ---- undo restores the previous state exactly
  const undo = await undoLastImport("owner");
  assert.equal(undo?.restored, res.updated);
  assert.equal(undo?.removed, res.created);
  assert.equal(JSON.stringify(await listAllMenuItems()), before, "menu is back to exactly what it was");
  assert.equal((await lastImportRun())?.undone, true);
  assert.equal(await undoLastImport("owner"), null, "nothing left to undo");
  meta = await billMetaByMenuItemId();
  assert.deepEqual(meta.get(suoi.id), { vatRate: 10, group: "DRINK", unit: null });

  console.log("menu-import-db checks passed");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
