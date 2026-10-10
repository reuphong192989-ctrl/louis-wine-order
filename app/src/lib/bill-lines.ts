/** The same dish ordered in several rounds prints as one line on the bill (qty and totals summed). */
export function mergeBillLines<T extends { name: string; unitPrice: number; vatRate: number; qty: number; lineTotal: number }>(lines: T[]): T[] {
  const map = new Map<string, T>();
  for (const l of lines) {
    const key = `${l.name}|${l.unitPrice}|${l.vatRate}`;
    const g = map.get(key);
    if (g) map.set(key, { ...g, qty: Math.round((g.qty + l.qty) * 100) / 100, lineTotal: g.lineTotal + l.lineTotal });
    else map.set(key, { ...l });
  }
  return [...map.values()];
}
