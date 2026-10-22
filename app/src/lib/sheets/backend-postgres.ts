import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
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
    const p = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
      // Retire idle connections before the database/pooler closes them on us, fail fast instead of hanging,
      // and keep TCP alive so a quiet restaurant hour doesn't leave dead sockets in the pool.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });
    // A server-closed idle connection emits 'error' on the pool; with no listener Node treats it as an
    // uncaught exception and the serverless instance dies mid-request (what staff saw as "mất kết nối").
    p.on("error", (e) => console.error("[pg] idle client error:", e.message));
    g.__louisPgPool = p;
  }
  return g.__louisPgPool;
}

const TRANSIENT = /Connection terminated|ECONNRESET|ETIMEDOUT|EPIPE|server closed the connection|timeout exceeded when trying to connect/i;
function isTransient(e: unknown): boolean {
  return TRANSIENT.test(e instanceof Error ? e.message : String(e));
}

/** Idempotent query (read, delete-by-id, IF NOT EXISTS…): retried once if the pooled connection was dead. */
async function q<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  try {
    return await pool().query<T>(text, params);
  } catch (e) {
    if (!isTransient(e)) throw e;
    return pool().query<T>(text, params);
  }
}

const headerCache = (g.__louisPgHeaders ??= new Map<string, string[]>());

type CacheEntry = { at: number; rows: SheetRow[] };
const g2 = globalThis as typeof globalThis & {
  __louisPgCache?: Map<string, CacheEntry>;
  __louisPgInflight?: Map<string, Promise<SheetRow[]>>;
};
const rowCache = (g2.__louisPgCache ??= new Map<string, CacheEntry>());
const inflight = (g2.__louisPgInflight ??= new Map<string, Promise<SheetRow[]>>());

function invalidate(tab: string) {
  rowCache.delete(tab);
  inflight.delete(tab);
}

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
    g.__louisPgReady = q(DDL)
      .then(() => undefined)
      .catch((e) => {
        g.__louisPgReady = undefined;
        throw e;
      });
  }
  return g.__louisPgReady;
}

async function beginTx(): Promise<PoolClient> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    return c;
  } catch (e) {
    c.release(e as Error); // passing an error destroys this client instead of returning a dead one to the pool
    throw e;
  }
}

async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  // Only opening the transaction is retried (nothing has been written yet); `fn` itself is never re-run.
  let c: PoolClient;
  try {
    c = await beginTx();
  } catch (e) {
    if (!isTransient(e)) throw e;
    c = await beginTx();
  }
  try {
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
  const run = c ? c.query.bind(c) : q;
  const res = await run<{ headers: string[] }>(
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
  const res = await q<{ headers: string[] }>("SELECT headers FROM app_tabs WHERE tab = $1", [tab]);
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
    q<{ id: string; data: Record<string, string> }>("SELECT id, data FROM app_rows WHERE tab = $1 ORDER BY id", [tab]),
  ]);
  return res.rows.map((r) => {
    const values: Record<string, string> = {};
    for (const h of headers) values[h] = "";
    for (const [k, v] of Object.entries(r.data)) values[k] = v == null ? "" : String(v);
    return { rowNumber: Number(r.id), values };
  });
}

/**
 * Cached read of several tabs, fetched together in ONE query for whichever tabs
 * are stale. Concurrent callers (e.g. several screens polling at once) on the
 * same warm serverless instance share the in-flight request instead of each
 * opening its own round trip — PostgreSQL has no per-minute request quota like
 * Sheets did, but every byte still counts against the plan's network-transfer
 * allowance, and polling screens were re-reading the full Orders/OrderItems
 * tables several times a second before this cache existed.
 */
export async function readTabsCached(tabs: string[], ttlMs: number): Promise<SheetRow[][]> {
  const now = Date.now();
  const missing = tabs.filter((t) => {
    const hit = rowCache.get(t);
    return !(hit && now - hit.at < ttlMs) && !inflight.has(t);
  });

  if (missing.length > 0) {
    const request = (async () => {
      await ready();
      const headersByTab = new Map(await Promise.all(missing.map(async (t) => [t, await headersFor(t)] as const)));
      const res = await q<{ tab: string; id: string; data: Record<string, string> }>(
        "SELECT tab, id, data FROM app_rows WHERE tab = ANY($1::text[]) ORDER BY tab, id",
        [missing],
      );
      const byTab = new Map<string, SheetRow[]>(missing.map((t) => [t, []]));
      for (const r of res.rows) {
        const headers = headersByTab.get(r.tab) ?? [];
        const values: Record<string, string> = {};
        for (const h of headers) values[h] = "";
        for (const [k, v] of Object.entries(r.data)) values[k] = v == null ? "" : String(v);
        byTab.get(r.tab)?.push({ rowNumber: Number(r.id), values });
      }
      return byTab;
    })();

    missing.forEach((t) => {
      const p = request.then((byTab) => byTab.get(t) ?? []);
      inflight.set(t, p);
      p.then(
        (rows) => {
          if (inflight.get(t) === p) {
            rowCache.set(t, { at: Date.now(), rows });
            inflight.delete(t);
          }
        },
        () => {
          if (inflight.get(t) === p) inflight.delete(t);
        },
      );
    });
  }

  return Promise.all(
    tabs.map((t) => {
      const p = inflight.get(t);
      if (p) return p;
      const hit = rowCache.get(t);
      return hit ? Promise.resolve(hit.rows) : readAllRows(t);
    }),
  );
}

export async function readAllRowsCached(tab: string, ttlMs: number): Promise<SheetRow[]> {
  const [rows] = await readTabsCached([tab], ttlMs);
  return rows;
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
  invalidate(tab);
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
  invalidate(tab);
  await ready();
  await q("DELETE FROM app_rows WHERE tab = $1", [tab]);
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
  invalidate(tab);
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
  invalidate(tab);
  await ready();
  await q("DELETE FROM app_rows WHERE tab = $1 AND id = ANY($2::bigint[])", [tab, rowNumbers]);
}

/** Connectivity check for /api/health — also creates the tables if they don't exist yet. */
export async function ping(): Promise<void> {
  await ready();
  await q("SELECT 1");
}

/** Closes the pool — for standalone scripts only. */
export async function closePool(): Promise<void> {
  await g.__louisPgPool?.end();
  g.__louisPgPool = undefined;
  g.__louisPgReady = undefined;
  headerCache.clear();
  rowCache.clear();
  inflight.clear();
}
