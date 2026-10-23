/**
 * Same checks as check-pg-cache.ts, but against a REAL PostgreSQL (PGlite) over
 * the actual `pg` driver instead of the hand-written fake — to catch anything
 * the mock's regexes could hide, like whether `ANY($1::text[])` really parses
 * and binds a JS string array over the wire. Requires DATABASE_URL set to a
 * reachable Postgres (e.g. the local PGlite server) and DATA_BACKEND=postgres.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-pg-cache-real.ts
 */
import assert from "node:assert/strict";
import "./load-env";

async function main() {
  const pg = await import("@/lib/sheets/backend-postgres");
  const { readTabsCached, readAllRowsCached, appendRow, readAllRows, closePool } = pg;

  const suffix = Date.now();
  const TAB_A = `RealTestA_${suffix}`;
  const TAB_B = `RealTestB_${suffix}`;
  const headers = ["id", "name"];

  await appendRow(TAB_A, headers, { id: "1", name: "first" });
  const first = await readAllRowsCached(TAB_A, 5_000);
  assert.equal(first.length, 1, "expected 1 row after first append");

  const a = await readAllRowsCached(TAB_A, 5_000);
  const b = await readAllRowsCached(TAB_A, 5_000);
  assert.equal(a, b, "two cached reads within the TTL window should return the exact same cached array");

  await appendRow(TAB_A, headers, { id: "2", name: "second" });
  const afterWrite = await readAllRowsCached(TAB_A, 5_000);
  assert.equal(afterWrite.length, 2, "newly appended row must be visible right after invalidation");

  await appendRow(TAB_B, headers, { id: "1", name: "b-row" });
  const [rowsA, rowsB] = await readTabsCached([TAB_A, TAB_B], 5_000);
  assert.equal(rowsA.length, 2);
  assert.equal(rowsB.length, 1);
  assert.equal(rowsB[0].values.name, "b-row");
  const rawA = await readAllRows(TAB_A);
  assert.deepEqual(
    rowsA.map((r) => r.values),
    rawA.map((r) => r.values),
    "cached multi-tab read (ANY($1::text[])) must match an uncached per-tab read"
  );

  const TAB_C = `RealTestC_${suffix}`;
  await appendRow(TAB_C, headers, { id: "1", name: "c" });
  const [p1, p2] = [readAllRowsCached(TAB_C, 5_000), readAllRowsCached(TAB_C, 5_000)];
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1, r2, "concurrent cached reads for the same tab should share one in-flight request");

  await appendRow(TAB_C, headers, { id: "2", name: "c2" });
  await new Promise((r) => setTimeout(r, 30));
  const expired = await readAllRowsCached(TAB_C, 10);
  assert.equal(expired.length, 2, "a short TTL must re-fetch from the real database");

  await closePool();
  console.log("pg-cache-real checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
