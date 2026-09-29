"use client";

import { LUMIA } from "@/lib/site/constants";
import { roomCode } from "@/lib/site/lumia";
import { fmt } from "@/lib/site/i18n";
import { useApp } from "./AppProviders";
import { IconRing } from "./icons";
import { KeyRound } from "lucide-react";

type Props = {
  floor: number | "";
  room: string;
  onChange: (floor: number | "", room: string) => void;
  locked?: boolean;
};

/** Floor + room selector that only allows existing Lumia rooms (5 floors x 6 rooms). */
export function RoomPicker({ floor, room, onChange, locked }: Props) {
  const { t } = useApp();
  if (locked && floor && room) {
    return (
      <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-400">{t.room.verified}</p>
          <p className="font-serif text-2xl mt-1">{fmt(t.room.floorRoom, { floor, room })}</p>
        </div>
        <IconRing icon={KeyRound} />
      </div>
    );
  }
  const rooms = floor ? Array.from({ length: LUMIA.roomsPerFloor }, (_, i) => roomCode(floor, i + 1)) : [];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">{t.room.floor}</label>
        <select className="input" value={floor} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "", "")} required>
          <option value="">{t.room.chooseFloor}</option>
          {Array.from({ length: LUMIA.floors }, (_, i) => i + 1).map((f) => (
            <option key={f} value={f}>
              {fmt(t.room.floorN, { n: f })}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t.room.room}</label>
        <select className="input" value={room} disabled={!floor} onChange={(e) => onChange(floor, e.target.value)} required>
          <option value="">{floor ? t.room.chooseRoom : t.room.floorFirst}</option>
          {rooms.map((r) => (
            <option key={r} value={r}>
              {fmt(t.room.roomN, { n: r })}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
