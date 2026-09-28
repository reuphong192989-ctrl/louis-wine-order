import { LUMIA } from "./constants";

/** Room code format: floor digit + 2-digit index, e.g. floor 3 room 2 => "302". */
export function roomCode(floor: number, index: number): string {
  return `${floor}${String(index).padStart(2, "0")}`;
}

export function allRooms(): { floor: number; room: string }[] {
  const out: { floor: number; room: string }[] = [];
  for (let f = 1; f <= LUMIA.floors; f++) {
    for (let r = 1; r <= LUMIA.roomsPerFloor; r++) {
      out.push({ floor: f, room: roomCode(f, r) });
    }
  }
  return out;
}

/** Returns true if floor/room combination exists in Lumia Apartment. */
export function isValidRoom(floor: unknown, room: unknown): boolean {
  const f = Number(floor);
  if (!Number.isInteger(f) || f < 1 || f > LUMIA.floors) return false;
  if (typeof room !== "string" || !/^\d{3}$/.test(room)) return false;
  const rf = Number(room[0]);
  const ri = Number(room.slice(1));
  return rf === f && ri >= 1 && ri <= LUMIA.roomsPerFloor;
}

export function parseRoom(room: string): { floor: number; room: string } | null {
  if (!/^\d{3}$/.test(room)) return null;
  const floor = Number(room[0]);
  return isValidRoom(floor, room) ? { floor, room } : null;
}
