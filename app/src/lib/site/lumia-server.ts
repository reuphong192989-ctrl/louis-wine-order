import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  return process.env.LUMIA_QR_SECRET || "louis-wine-lumia-apartment-qr";
}

/** Short signature printed in each room's QR code so the room cannot be spoofed. */
export function signRoom(room: string): string {
  return createHmac("sha256", secret()).update(`lumia:${room}`).digest("hex").slice(0, 10);
}

export function verifyRoomKey(room: string, key: string | null | undefined): boolean {
  if (!key) return false;
  const expected = Buffer.from(signRoom(room));
  const given = Buffer.from(String(key));
  return expected.length === given.length && timingSafeEqual(expected, given);
}
