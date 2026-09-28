export function cleanPhone(p: unknown): string | null {
  if (typeof p !== "string") return null;
  const s = p.replace(/[\s.\-()]/g, "");
  return /^(0|\+84)\d{9,10}$/.test(s) ? s : null;
}

export function cleanText(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s.length ? s : null;
}

export function genCode(prefix: string): string {
  const t = Date.now().toString(36).slice(-4).toUpperCase();
  const r = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}${t}${r}`;
}

/** Today's date in Vietnam timezone, YYYY-MM-DD */
export function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

/** Current time in Vietnam timezone, HH:MM */
export function nowTimeVN(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}
