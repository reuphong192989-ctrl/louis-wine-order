/**
 * One spelling per physical table. The printed table QR codes use "T<floor>-<table>"
 * (T2-05), so every way of typing the same table — "2-05", "2-5", "t2-05", "T2.05",
 * "2 05" — is stored as "T2-05". Anything else (custom codes like "5-Pla1", "01",
 * "VIP 8") is kept as typed, trimmed.
 */
export function normalizeTableId(raw: string): string {
  const s = raw.trim();
  const m = /^[Tt]?\s*(\d{1,2})\s*[-.\s/]\s*(\d{1,3})$/.exec(s);
  if (!m) return s;
  return `T${Number(m[1])}-${String(Number(m[2])).padStart(2, "0")}`;
}

/** Label shown after "Bàn " when a table has no custom name: "T2-05" → "05 · Tầng 2". */
export function defaultTableLabel(tableId: string): string {
  const m = /^T(\d+)-(\d+)$/.exec(tableId);
  return m ? `${m[2]} · Tầng ${m[1]}` : tableId;
}

/** Floor number of a table code, if it has one ("T2-05" / "2-05" / "5-Pla1" → "2" / "2" / "5"). */
export function floorOfTableId(tableId: string): string | null {
  const m = /^[Tt]?(\d+)-/.exec(tableId);
  return m ? String(Number(m[1])) : null;
}
