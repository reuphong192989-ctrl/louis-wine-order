import { Pool, type PoolClient } from "pg";
import type { SheetRow } from "./backend-sheets";

/**
 * PostgreSQL implementation of the same row-store API as backend-sheets.ts.
 *
 * Every Google Sheets tab becomes a set of rows in `app_rows` (one JSONB object
 * per row, keyed by header name — exactly what the entity modules already
 * encode/decode). `rowNumber` is the row's stable primary key instead of its
 * sheet position, so it never shifts when other rows are deleted. Header lists
 * are kept in `app_tabs` so rows written before a column was added still read
 * back "" for it, like an empty Sheets cell.
 */

const g = globalThis as typeof globalThis & {
  __louisPgPool?: Pool;
  __louisPgReady?: Promise<void>;
  __louisPgHeaders?: Map<string, string[]>;
};

function pool(): Pool {
  if (!g.__louisPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Thiếu biến môi trường DATABASE_URL (cấu hình PostgreSQL).");
    // Serverless functions: keep each instance's pool small; use a pooled (PgBouncer) URL in production.
    g.__louisPgPool = new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX) || 5 });
  }
  return g.__louisPgPool;
}

const headerCache = (g.__louisPgHeaders ??= new Map<string, string[]>());

const DDL = `
CREATE TABLE IF NOT EXISTS app_tabs (
  tab text PRIMARY KEY,
  headers jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS app_rows (
  id bigserial PRIMARY KEY,
  tab text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_rows_tab_id_idx ON app_rows (tab, id);
`;

async function ready(): Promise<void> {
  if (!g.__louisPgReady) {
    g.__louisPgReady = pool()
      .query(DDL)
      .then(() => undefined)
      .catch((e) => {
        g.__louisPgReady = undefined;
        throw e;
      });
  }
  return g.__louisPgReady;
}

async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Records the tab's header list (merging in any new columns) so reads can fill missing cells with "". */
async function rememberHeaders(tab: string, headers: string[], c?: PoolClient): Promise<void> {
  const known = headerCache.get(tab);
  if (known && headers.every((h) => known.includes(h))) return;
  const merged = [...(known ?? []), ...headers.filter((h) => !(known ?? []).includes(h))];
  const res = await (c ?? pool()).query<{ headers: string[] }>(
    `INSERT INTO app_tabs (tab, headers) VALUES ($1, $2::jsonb)
     ON CONFLICT (tab) DO UPDATE SET headers = (
       SELECT jsonb_agg(h) FROM (
         SELECT h FROM jsonb_array_elements_text(app_tabs.headers) AS h
         UNION
         SELECT h FROM jsonb_array_elements_text(EXCLUDED.headers) AS h
       ) s
     )
     RETURNING headers`,
    [tab, JSON.stringify(merged)],
  );
  headerCache.set(tab, res.rows[0].headers);
}

async function headersFor(tab: string): Promise<string[]> {
  const known = headerCache.get(tab);
  if (known) return known;
  const res = await pool().query<{ headers: string[] }>("SELECT headers FROM app_tabs WHERE tab = $1", [tab]);
  const headers = res.rows[0]?.headers ?? [];
  headerCache.set(tab, headers);
  return headers;
}

function rowRecord(headers: string[], record: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) out[h] = record[h] ?? "";
  return out;
}

export async function readAllRows(tab: string): Promise<SheetRow[]> {
  await ready();
  const [headers, res] = await Promise.all([
    headersFor(tab),
    pool().query<{ id: string; data: Record<string, string> }>("SELECT id, data FROM app_rows WHERE tab = $1 ORDER BY id", [tab]),
  ]);
  return res.rows.map((r) => {
    const values: Record<string, string> = {};
    for (const h of headers) values[h] = "";
    for (const [k, v] of Object.entries(r.data)) values[k] = v == null ? "" : String(v);
    return { rowNumber: Number(r.id), values };
  });
}

/** PostgreSQL has no per-minute quota, so "cached" reads simply read fresh. */
export async function readTabsCached(tabs: string[], _ttlMs: number): Promise<SheetRow[][]> {
  return Promise.all(tabs.map(readAllRows));
}

export async function readAllRowsCached(tab: string, _ttlMs: number): Promise<SheetRow[]> {
  return readAllRows(tab);
}

export async function ensureTab(tab: string, headers: string[]): Promise<void> {
  await ready();
  await rememberHeaders(tab, headers);
}

export async function appendRow(tab: string, headers: string[], record: Record<string, string>): Promise<void> {
  await appendRows(tab, headers, [record]);
}

/** Inserts all rows in one transaction — either every row lands or none does. */
export async function appendRows(tab: string, headers: string[], records: Record<string, string>[]): Promise<void> {
  if (records.length === 0) return;
  await withTx(async (c) => {
    await rememberHeaders(tab, headers, c);
    const params: unknown[] = [tab];
    const values = records.map((r, i) => {
      params.push(JSON.stringify(rowRecord(headers, r)));
      return `($1, $${i + 2}::jsonb)`;
    });
    await c.query(`INSERT INTO app_rows (tab, data) VALUES ${values.join(", ")}`, params);
  });
}

export async function clearTabData(tab: string): Promise<void> {
  await ready();
  await pool().query("DELETE FROM app_rows WHERE tab = $1", [tab]);
}

export async function updateRow(tab: string, rowNumber: number, headers: string[], record: Record<string, string>): Promise<void> {
  await batchUpdateRows(tab, headers, [{ rowNumber, record }]);
}

export async function batchUpdateRows(
  tab: string,
  headers: string[],
  updates: { rowNumber: number; record: Record<string, string> }[],
): Promise<void> {
  if (updates.length === 0) return;
  await withTx(async (c) => {
    await rememberHeaders(tab, headers, c);
    for (const { rowNumber, record } of updates) {
      // Merge like a Sheets range write: columns outside `headers` keep their current values.
      await c.query("UPDATE app_rows SET data = data || $3::jsonb, updated_at = now() WHERE tab = $1 AND id = $2", [
        tab,
        rowNumber,
        JSON.stringify(rowRecord(headers, record)),
      ]);
    }
  });
}

export async function deleteRow(tab: string, rowNumber: number): Promise<void> {
  return deleteRows(tab, [rowNumber]);
}

export async function deleteRows(tab: string, rowNumbers: number[]): Promise<void> {
  if (rowNumbers.length === 0) return;
  await ready();
  await pool().query("DELETE FROM app_rows WHERE tab = $1 AND id = ANY($2::bigint[])", [tab, rowNumbers]);
}

/** Connectivity check for /api/health — also creates the tables if they don't exist yet. */
export async function ping(): Promise<void> {
  await ready();
  await pool().query("SELECT 1");
}

/** Closes the pool — for standalone scripts only. */
export async function closePool(): Promise<void> {
  await g.__louisPgPool?.end();
  g.__louisPgPool = undefined;
  g.__louisPgReady = undefined;
  headerCache.clear();
}
