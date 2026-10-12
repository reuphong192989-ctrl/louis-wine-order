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

const tablesOnFloor = (floor: number, count: number) =>
  Array.from({ length: count }, (_, i) => `T${floor}-${String(i + 1).padStart(2, "0")}`);

/**
 * The tables that physically exist (Oct 2026): floor 3 shared banquet hall (2 zones), floor 4 eight VIP rooms,
 * floor 5 five rooms (3 Platinum + 2 VIP). Codes stay stable; friendly room names are set in Quản trị → Tên bàn
 * (TableNames), so renaming rooms later needs no code change. Add a floor/room here if the venue grows.
 */
export const OFFICIAL_TABLE_IDS: readonly string[] = [...tablesOnFloor(3, 2), ...tablesOnFloor(4, 8), ...tablesOnFloor(5, 5)];

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
