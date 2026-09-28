import { randomUUID } from "crypto";
import { appendRow, readAllRows, readAllRowsCached, updateRow, cell } from "./core";

const TAB = "Reviews";
const HEADERS = ["id", "customerName", "rating", "comment", "visitType", "isLumiaGuest", "isVisible", "createdAt"];

export type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  visitType: string | null;
  isLumiaGuest: boolean;
  isVisible: boolean;
  createdAt: string;
};

function decode(v: Record<string, string>): Review {
  return {
    id: v.id,
    customerName: v.customerName,
    rating: cell.toInt(v.rating, 5),
    comment: v.comment,
    visitType: cell.strOrNull(v.visitType ?? ""),
    isLumiaGuest: cell.toBool(v.isLumiaGuest ?? ""),
    isVisible: v.isVisible !== "false",
    createdAt: v.createdAt,
  };
}

function encode(r: Review): Record<string, string> {
  return {
    id: r.id,
    customerName: r.customerName,
    rating: cell.int(r.rating),
    comment: r.comment,
    visitType: cell.str(r.visitType),
    isLumiaGuest: cell.bool(r.isLumiaGuest),
    isVisible: cell.bool(r.isVisible),
    createdAt: r.createdAt,
  };
}

const LIST_TTL_MS = 10_000;

/** All reviews, most recent first (admin view). */
export async function listReviews(): Promise<Review[]> {
  const rows = await readAllRowsCached(TAB, LIST_TTL_MS);
  return rows.map((r) => decode(r.values)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Public summary: average, star distribution and the latest visible reviews. */
export async function reviewSummary(limit = 30) {
  const visible = (await listReviews()).filter((r) => r.isVisible);
  const count = visible.length;
  const avg = count ? visible.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, n: visible.filter((r) => r.rating === star).length }));
  return { count, avg, dist, list: visible.slice(0, limit) };
}

export async function createReview(input: Omit<Review, "id" | "isVisible" | "createdAt">): Promise<Review> {
  const r: Review = { ...input, id: randomUUID(), isVisible: true, createdAt: new Date().toISOString() };
  await appendRow(TAB, HEADERS, encode(r));
  return r;
}

export async function setReviewVisible(id: string, isVisible: boolean): Promise<boolean> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return false;
  await updateRow(TAB, row.rowNumber, HEADERS, encode({ ...decode(row.values), isVisible }));
  return true;
}

export const REVIEWS_TAB = TAB;
export const REVIEWS_HEADERS = HEADERS;
