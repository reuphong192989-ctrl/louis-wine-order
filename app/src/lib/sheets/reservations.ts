import { randomUUID } from "crypto";
import { appendRow, readAllRows, readAllRowsCached, updateRow, cell } from "./core";

const TAB = "Reservations";
const HEADERS = [
  "id",
  "code",
  "customerName",
  "phone",
  "date",
  "time",
  "guests",
  "area",
  "occasion",
  "isLumiaGuest",
  "hotelRoom",
  "roomVerified",
  "needShuttle",
  "pickupTime",
  "note",
  "status",
  "createdAt",
  "handledBy",
];

// new → confirmed → seated → completed, or cancelled
export type ReservationStatus = "NEW" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED";
export const RESERVATION_STATUSES: ReservationStatus[] = ["NEW", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED"];

export type Reservation = {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  date: string; // YYYY-MM-DD (Vietnam time)
  time: string; // HH:MM
  guests: number;
  area: string | null;
  occasion: string | null;
  isLumiaGuest: boolean;
  hotelRoom: string | null;
  roomVerified: boolean;
  needShuttle: boolean;
  pickupTime: string | null;
  note: string | null;
  status: ReservationStatus;
  createdAt: string;
  handledBy: string | null;
};

function decode(v: Record<string, string>): Reservation {
  return {
    id: v.id,
    code: v.code,
    customerName: v.customerName,
    phone: v.phone,
    date: v.date,
    time: v.time,
    guests: cell.toInt(v.guests, 1),
    area: cell.strOrNull(v.area ?? ""),
    occasion: cell.strOrNull(v.occasion ?? ""),
    isLumiaGuest: cell.toBool(v.isLumiaGuest ?? ""),
    hotelRoom: cell.strOrNull(v.hotelRoom ?? ""),
    roomVerified: cell.toBool(v.roomVerified ?? ""),
    needShuttle: cell.toBool(v.needShuttle ?? ""),
    pickupTime: cell.strOrNull(v.pickupTime ?? ""),
    note: cell.strOrNull(v.note ?? ""),
    status: (v.status || "NEW") as ReservationStatus,
    createdAt: v.createdAt,
    handledBy: cell.strOrNull(v.handledBy ?? ""),
  };
}

function encode(r: Reservation): Record<string, string> {
  return {
    id: r.id,
    code: r.code,
    customerName: r.customerName,
    phone: r.phone,
    date: r.date,
    time: r.time,
    guests: cell.int(r.guests),
    area: cell.str(r.area),
    occasion: cell.str(r.occasion),
    isLumiaGuest: cell.bool(r.isLumiaGuest),
    hotelRoom: cell.str(r.hotelRoom),
    roomVerified: cell.bool(r.roomVerified),
    needShuttle: cell.bool(r.needShuttle),
    pickupTime: cell.str(r.pickupTime),
    note: cell.str(r.note),
    status: r.status,
    createdAt: r.createdAt,
    handledBy: cell.str(r.handledBy),
  };
}

const LIST_TTL_MS = 2_000;

/** Most recent first. */
export async function listReservations(limit = 300): Promise<Reservation[]> {
  const rows = await readAllRowsCached(TAB, LIST_TTL_MS);
  return rows
    .map((r) => decode(r.values))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function findReservationByCode(code: string): Promise<Reservation | null> {
  const all = await listReservations(100000);
  return all.find((r) => r.code === code) ?? null;
}

export async function createReservation(input: Omit<Reservation, "id" | "status" | "createdAt" | "handledBy">): Promise<Reservation> {
  const r: Reservation = { ...input, id: randomUUID(), status: "NEW", createdAt: new Date().toISOString(), handledBy: null };
  await appendRow(TAB, HEADERS, encode(r));
  return r;
}

export async function setReservationStatus(id: string, status: ReservationStatus, handledBy: string): Promise<Reservation | null> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return null;
  const next = { ...decode(row.values), status, handledBy };
  await updateRow(TAB, row.rowNumber, HEADERS, encode(next));
  return next;
}

export const RESERVATIONS_TAB = TAB;
export const RESERVATIONS_HEADERS = HEADERS;
