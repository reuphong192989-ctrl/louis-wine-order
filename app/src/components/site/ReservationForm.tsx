"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProviders";
import { RoomPicker } from "./RoomPicker";
import { DICTS, fmt } from "@/lib/site/i18n";

const SLOTS: string[] = [];
for (let h = 10; h <= 22; h++) {
  SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 22) SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

// Staff read bookings in Vietnamese: the form shows translated labels but submits these values.
const AREAS_VI = DICTS.vi.booking.areas;
const OCCASIONS_VI = DICTS.vi.booking.occasions;

function minusMinutes(t: string, m: number) {
  const [h, mm] = t.split(":").map(Number);
  let total = h * 60 + mm - m;
  if (total < 0) total = 0;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function todayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function ReservationForm() {
  const { lumia, ready, t } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:30");
  const [guests, setGuests] = useState(2);
  const [areaIdx, setAreaIdx] = useState(0);
  const [occasionIdx, setOccasionIdx] = useState(0);
  const [isLumia, setIsLumia] = useState(false);
  const [floor, setFloor] = useState<number | "">("");
  const [room, setRoom] = useState("");
  const [needShuttle, setNeedShuttle] = useState(true);
  // null = follow the default (30 min before the reservation, 5km trip)
  const [pickupOverride, setPickupOverride] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- set on client only to avoid hydration mismatch
  useEffect(() => setDate(todayStr()), []);

  useEffect(() => {
    if (ready && lumia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage-backed Lumia session after hydration
      setIsLumia(true);
      setFloor(lumia.floor);
      setRoom(lumia.room);
    }
  }, [ready, lumia]);

  const pickupTime = pickupOverride ?? minusMinutes(time, 30);

  const locked = !!(lumia?.verified && isLumia && floor === lumia.floor && room === lumia.room);
  const minDate = useMemo(() => (date ? todayStr() : undefined), [date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isLumia && (!floor || !room)) {
      setError(t.booking.errRoom);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          date,
          time,
          guests,
          area: AREAS_VI[areaIdx],
          occasion: occasionIdx > 0 ? OCCASIONS_VI[occasionIdx] : "",
          isLumiaGuest: isLumia,
          floor,
          room,
          lumiaKey: lumia && lumia.room === room ? lumia.key : null,
          needShuttle: isLumia && needShuttle,
          pickupTime,
          note,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || t.cart.errGeneric);
      setDone(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.cart.errGeneric);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gold-500/40 bg-wood-900/80 p-8 text-center">
        <div className="text-5xl">🍷</div>
        <h3 className="font-serif text-3xl mt-3 gold-text">{t.booking.doneTitle}</h3>
        <p className="mt-2 text-cream/70">
          {t.booking.code}: <span className="font-mono text-gold-300 text-lg">{done}</span>
        </p>
        <p className="mt-4 text-cream/70 text-sm leading-relaxed">
          {fmt(t.booking.summary, { guests, time, date: date.split("-").reverse().join("/") })}
          {isLumia && (
            <>
              <br />
              <b className="text-gold-300">{fmt(t.booking.lumiaLine, { room })}</b>
              {needShuttle && (
                <>
                  <br />
                  {fmt(t.booking.shuttleLine, { time: pickupTime })}
                </>
              )}
            </>
          )}
        </p>
        <p className="mt-4 text-sm text-cream/60">{fmt(t.booking.callBack, { phone })}</p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href={`/dat-ban/${done}`} className="btn-outline">
            {t.booking.details}
          </Link>
          <button className="btn-gold" onClick={() => setDone(null)}>
            {t.booking.another}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gold-500/25 bg-wood-900/70 backdrop-blur p-6 sm:p-8 grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t.booking.name}</label>
          <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t.booking.namePh} />
        </div>
        <div>
          <label className="label">{t.booking.phone}</label>
          <input
            className="input"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            placeholder={t.booking.phonePh}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">{t.booking.date}</label>
          <input type="date" className="input" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">{t.booking.time}</label>
          <select
            className="input"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setPickupOverride(null);
            }}
          >
            {SLOTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label">{t.booking.guests}</label>
          <input type="number" min={1} max={100} className="input" value={guests} onChange={(e) => setGuests(Number(e.target.value))} required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t.booking.area}</label>
          <select className="input" value={areaIdx} onChange={(e) => setAreaIdx(Number(e.target.value))}>
            {t.booking.areas.map((a, i) => (
              <option key={i} value={i}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t.booking.occasion}</label>
          <select className="input" value={occasionIdx} onChange={(e) => setOccasionIdx(Number(e.target.value))}>
            {t.booking.occasions.map((o, i) => (
              <option key={i} value={i}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`rounded-xl border p-4 transition ${isLumia ? "border-gold-500/60 bg-gold-500/5" : "border-gold-500/20"}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#c9a14a]" checked={isLumia} onChange={(e) => setIsLumia(e.target.checked)} />
          <span>
            <span className="font-semibold text-gold-300">{t.booking.lumia}</span>
            <span className="block text-sm text-cream/60">{t.booking.lumiaSub}</span>
          </span>
        </label>
        {isLumia && (
          <div className="mt-4 grid gap-4">
            <RoomPicker
              floor={floor}
              room={room}
              locked={locked}
              onChange={(f, r) => {
                setFloor(f);
                setRoom(r);
              }}
            />
            {!locked && <p className="text-xs text-cream/50">{t.booking.lumiaTip}</p>}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-[#c9a14a]" checked={needShuttle} onChange={(e) => setNeedShuttle(e.target.checked)} />
              <span className="text-sm">{t.booking.shuttle}</span>
            </label>
            {needShuttle && (
              <div className="max-w-xs">
                <label className="label">{t.booking.pickupTime}</label>
                <select className="input" value={pickupTime} onChange={(e) => setPickupOverride(e.target.value)}>
                  {[...new Set([minusMinutes(time, 45), minusMinutes(time, 30), minusMinutes(time, 15), time])].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="label">{t.booking.note}</label>
        <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.booking.notePh} />
      </div>
      {error && <p className="text-sm text-wine-300 bg-wine-900/40 border border-wine-700 rounded-lg px-3 py-2">{error}</p>}
      <button className="btn-gold w-full sm:w-auto sm:justify-self-start" disabled={loading}>
        {loading ? t.booking.sending : t.booking.submit}
      </button>
    </form>
  );
}
