/**
 * Regression check for src/lib/sheets/backend-sheets.ts's `cell` decode helpers. A row written before a
 * column existed must decode EXACTLY like an empty cell — on Postgres that means the value can arrive as
 * `undefined` (not just ""), because the tab's header registry only grows on a write, not the moment code
 * adds a new column. Missing this broke /thu-ngan/bao-cao in production on 23/10: cell.toInt(undefined)
 * returned NaN, which JSON.stringify silently turns into `null`, and `null.toLocaleString()` on the
 * client threw "Application error: a client-side exception has occurred". Run: npm run check:cell
 */
import assert from "node:assert/strict";
import { cell } from "../src/lib/sheets/backend-sheets";

// toInt: undefined must behave exactly like "" (both missing-cell representations).
assert.equal(cell.toInt(undefined), 0);
assert.equal(cell.toInt(null as unknown as undefined), 0);
assert.equal(cell.toInt(""), 0);
assert.equal(cell.toInt(undefined, 7), 7);
assert.equal(cell.toInt("123"), 123);
assert.equal(cell.toInt("0"), 0);
assert.equal(cell.toInt("garbage"), 0); // never NaN, even for a corrupt cell

// numOrNull: same contract, plus never NaN.
assert.equal(cell.numOrNull(undefined), null);
assert.equal(cell.numOrNull(""), null);
assert.equal(cell.numOrNull("42"), 42);
assert.equal(cell.numOrNull("garbage"), null);

// strOrNull / str / toBool: already-defensive, lock in undefined handling too.
assert.equal(cell.strOrNull(undefined), null);
assert.equal(cell.strOrNull(""), null);
assert.equal(cell.strOrNull("x"), "x");
assert.equal(cell.str(undefined), "");
assert.equal(cell.toBool(undefined), false);

// The exact crash: a value that survives as NaN must never happen, because JSON.stringify(NaN) → null,
// and `null.toLocaleString()` throws on the client. Assert the whole chain is NaN-free.
const n = cell.toInt(undefined);
assert.equal(Number.isNaN(n), false);
const roundTripped = JSON.parse(JSON.stringify({ n }));
assert.equal(roundTripped.n, 0);
assert.doesNotThrow(() => (roundTripped.n as number).toLocaleString("vi-VN"));

console.log("cell-helpers checks passed");
