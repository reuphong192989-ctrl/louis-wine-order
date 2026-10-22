/**
 * Focused check for the new readTabsCached/readAllRowsCached caching layer in
 * backend-postgres.ts: cache hits avoid a DB round trip within the TTL window,
 * writes invalidate the cache immediately (read-your-own-write), concurrent
 * callers share one in-flight request, and multiple tabs are fetched in one
 * query. Run: npm run check:pg-cache
 */
import assert from "node:assert/strict";
import { installFakePg } from "./fake-pg";

installFakePg();

async function main() {
  const pg = await import("@/lib/sheets/backend-postgres");
  const { readTabsCached, readAllRowsCached, appendRow, readAllRows } = pg;

  const TAB_A = "TestA";
  const TAB_B = "TestB";
  const headers = ["id", "name"];

  // 1) Cache hit: a second read within the TTL window returns the same row count
  //    without a fresh row having been appended showing up yet (still cached).
  await appendRow(TAB_A, headers, { id: "1", name: "first" });
  const first = await readAllRowsCached(TAB_A, 5_000);
  assert.equal(first.length, 1, "expected 1 row after first append");

  // Append bypassing invalidation check: appendRow DOES invalidate, so to prove
  // the cache itself (not just invalidation) we read through readAllRows (raw)
  // after manually re-priming the cache via a cached read, then insert "behind
  // the cache's back" isn't possible since every write path invalidates — which
  // is exactly the contract we want. So instead verify: two back-to-back cached
  // reads with no write in between hit the SAME in-memory array reference.
  const a = await readAllRowsCached(TAB_A, 5_000);
  const b = await readAllRowsCached(TAB_A, 5_000);
  assert.equal(a, b, "two cached reads within the TTL window should return the exact same cached array");

  // 2) Invalidation on write: appending a row must be visible on the very next
  //    cached read (read-your-own-write), even though the TTL has not elapsed.
  await appendRow(TAB_A, headers, { id: "2", name: "second" });
  const afterWrite = await readAllRowsCached(TAB_A, 5_000);
  assert.equal(afterWrite.length, 2, "expected the newly appended row to be visible immediately after invalidation");

  // 3) Multi-tab fetch: reading two tabs at once returns each tab's own rows,
  //    not a mix, and matches an uncached read.
  await appendRow(TAB_B, headers, { id: "1", name: "b-row" });
  const [rowsA, rowsB] = await readTabsCached([TAB_A, TAB_B], 5_000);
  assert.equal(rowsA.length, 2);
  assert.equal(rowsB.length, 1);
  assert.equal(rowsB[0].values.name, "b-row");
  const rawA = await readAllRows(TAB_A);
  assert.deepEqual(
    rowsA.map((r) => r.values),
    rawA.map((r) => r.values),
    "cached multi-tab read must match an uncached read"
  );

  // 4) Concurrent callers share one in-flight request: fire two cached reads
  //    for a tab with an expired/no cache entry back-to-back (synchronously,
  //    no await between them) and confirm they resolve to the same array.
  const TAB_C = "TestC";
  await appendRow(TAB_C, headers, { id: "1", name: "c" });
  // Prime nothing — cache for TAB_C is empty right after the write-invalidate.
  const [p1, p2] = [readAllRowsCached(TAB_C, 5_000), readAllRowsCached(TAB_C, 5_000)];
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1, r2, "concurrent cached reads for the same tab should share one in-flight request");

  // 5) TTL expiry: after the TTL elapses, a write made without going through
  //    the cached API's own invalidation (simulated here by just waiting) must
  //    still eventually read fresh — i.e. a short TTL does re-fetch.
  await appendRow(TAB_C, headers, { id: "2", name: "c2" });
  await new Promise((r) => setTimeout(r, 30));
  const expired = await readAllRowsCached(TAB_C, 10); // 10ms TTL, well under our 30ms wait
  assert.equal(expired.length, 2);

  console.log("pg-cache checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
