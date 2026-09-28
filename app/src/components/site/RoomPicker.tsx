"use client";

import { LUMIA } from "@/lib/site/constants";
import { roomCode } from "@/lib/site/lumia";

type Props = {
  floor: number | "";
  room: string;
  onChange: (floor: number | "", room: string) => void;
  locked?: boolean;
};

/** Floor + room selector that only allows existing Lumia rooms (5 floors x 6 rooms). */
export function RoomPicker({ floor, room, onChange, locked }: Props) {
  if (locked && floor && room) {
    return (
      <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-400">Lumia Apartment · đã xác thực QR</p>
          <p className="font-serif text-2xl mt-1">
            Tầng {floor} · Phòng <span className="text-gold-300">{room}</span>
          </p>
        </div>
        <span className="text-3xl">🔑</span>
      </div>
    );
  }
  const rooms = floor ? Array.from({ length: LUMIA.roomsPerFloor }, (_, i) => roomCode(floor, i + 1)) : [];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Tầng *</label>
        <select
          className="input"
          value={floor}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "", "")}
          required
        >
          <option value="">-- Chọn tầng --</option>
          {Array.from({ length: LUMIA.floors }, (_, i) => i + 1).map((f) => (
            <option key={f} value={f}>
              Tầng {f}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Số phòng *</label>
        <select
          className="input"
          value={room}
          disabled={!floor}
          onChange={(e) => onChange(floor, e.target.value)}
          required
        >
          <option value="">{floor ? "-- Chọn phòng --" : "Chọn tầng trước"}</option>
          {rooms.map((r) => (
            <option key={r} value={r}>
              Phòng {r}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
