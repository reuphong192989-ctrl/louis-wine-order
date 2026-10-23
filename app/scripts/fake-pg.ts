/**
 * In-memory stand-in for PostgreSQL, speaking exactly the statements src/lib/sheets/backend-postgres.ts issues.
 * Lets the check scripts run the app's real storage code (orders, menu, categories…) without a database.
 * Call installFakePg() BEFORE importing any app module that touches storage.
 */
import { createRequire } from "node:module";

export function installFakePg() {
  process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:1/db"; // never connected — pg is stubbed
  process.env.DATA_BACKEND = "postgres";

  const appRequire = createRequire(process.cwd() + "/package.json");
  const { Pool } = appRequire("pg") as typeof import("pg");

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
    if (/^SELECT tab, id, data FROM app_rows WHERE tab = ANY\(\$1::text\[\]\)/i.test(t)) {
      const wanted = new Set(params[0] as string[]);
      return {
        rows: rows
          .filter((r) => wanted.has(r.tab))
          .sort((a, b) => (a.tab === b.tab ? a.id - b.id : a.tab < b.tab ? -1 : 1))
          .map((r) => ({ tab: r.tab, id: String(r.id), data: r.data })),
      };
    }
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
    if (/^DELETE FROM app_rows WHERE tab = \$1$/i.test(t)) {
      rows = rows.filter((r) => r.tab !== params[0]);
      return { rows: [] };
    }
    throw new Error("fake db: unsupported statement: " + t.slice(0, 80));
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = Pool.prototype as any;
  P.query = run;
  P.connect = async () => ({ query: run, release: () => {} });

  return {
    /** Raw row insert — used to simulate rows written before a column existed. */
    insertRaw(tab: string, data: Record<string, string>) {
      rows.push({ id: nextId++, tab, data });
    },
  };
}
