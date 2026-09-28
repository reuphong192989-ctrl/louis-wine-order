const g = globalThis as typeof globalThis & { __louisRate?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__louisRate ??= new Map<string, number[]>());

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * In-memory sliding-window limiter (per server instance). Returns true when the
 * request is allowed. Good enough to stop form spam on a single-instance deploy.
 */
export function rateLimit(req: Request, bucket: string, max: number, windowMs: number): boolean {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}

export function tooMany() {
  return Response.json({ ok: false, error: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút." }, { status: 429 });
}
