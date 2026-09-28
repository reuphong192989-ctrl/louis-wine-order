"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProviders";
import { RoomPicker } from "./RoomPicker";

const SLOTS: string[] = [];
for (let h = 10; h <= 22; h++) {
  SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 22) SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

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
  const { lumia, ready } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:30");
  const [guests, setGuests] = useState(2);
  const [area, setArea] = useState("Không yêu cầu");
  const [occasion, setOccasion] = useState("");
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
      setError("Vui lòng chọn chính xác tầng và số phòng tại Lumia Apartment.");
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
          area,
          occasion,
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
      if (!data.ok) throw new Error(data.error || "Có lỗi xảy ra");
      setDone(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gold-500/40 bg-wood-900/80 p-8 text-center">
        <div className="text-5xl">🍷</div>
        <h3 className="font-serif text-3xl mt-3 gold-text">Đặt bàn thành công!</h3>
        <p className="mt-2 text-cream/70">
          Mã đặt bàn: <span className="font-mono text-gold-300 text-lg">{done}</span>
        </p>
        <p className="mt-4 text-cream/70 text-sm leading-relaxed">
          {guests} khách · {time} ngày {date.split("-").reverse().join("/")}
          {isLumia && (
            <>
              <br />
              Khách Lumia Apartment · Tầng {floor} · Phòng {room} — <b className="text-gold-300">giảm 10% hoá đơn</b>
              {needShuttle && (
                <>
                  <br />
                  Xe đưa đón sẽ có mặt tại sảnh Lumia lúc <b className="text-gold-300">{pickupTime}</b>
                </>
              )}
            </>
          )}
        </p>
        <p className="mt-4 text-sm text-cream/60">Nhân viên sẽ gọi xác nhận qua số {phone} trong ít phút.</p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href={`/dat-ban/${done}`} className="btn-outline">Xem chi tiết</Link>
          <button className="btn-gold" onClick={() => setDone(null)}>Đặt thêm bàn</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gold-500/25 bg-wood-900/70 backdrop-blur p-6 sm:p-8 grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Họ và tên *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nguyễn Văn A" />
        </div>
        <div>
          <label className="label">Số điện thoại *</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="09xx xxx xxx" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Ngày *</label>
          <input type="date" className="input" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Giờ *</label>
          <select className="input" value={time} onChange={(e) => {
              setTime(e.target.value);
              setPickupOverride(null);
            }}>
            {SLOTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Số khách *</label>
          <input type="number" min={1} max={100} className="input" value={guests} onChange={(e) => setGuests(Number(e.target.value))} required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Khu vực mong muốn</label>
          <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            <option>Không yêu cầu</option>
            <option>Sảnh chính</option>
            <option>Phòng VIP riêng</option>
            <option>Hầm rượu (bàn tròn)</option>
            <option>Phòng lounge sofa</option>
          </select>
        </div>
        <div>
          <label className="label">Dịp đặc biệt</label>
          <select className="input" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
            <option value="">Không</option>
            <option>Sinh nhật</option>
            <option>Kỷ niệm</option>
            <option>Tiếp khách / công việc</option>
            <option>Họp mặt gia đình</option>
          </select>
        </div>
      </div>

      <div className={`rounded-xl border p-4 transition ${isLumia ? "border-gold-500/60 bg-gold-500/5" : "border-gold-500/20"}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#c9a14a]" checked={isLumia} onChange={(e) => setIsLumia(e.target.checked)} />
          <span>
            <span className="font-semibold text-gold-300">Tôi đang lưu trú tại Lumia Apartment</span>
            <span className="block text-sm text-cream/60">Giảm 10% hoá đơn + xe đưa đón miễn phí (cách nhà hàng 5km)</span>
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
            {!locked && (
              <p className="text-xs text-cream/50">
                Mẹo: quét mã QR dán trong phòng để tự động điền đúng số phòng. Nhân viên sẽ xác minh số phòng khi gọi xác nhận.
              </p>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-[#c9a14a]" checked={needShuttle} onChange={(e) => setNeedShuttle(e.target.checked)} />
              <span className="text-sm">🚐 Tôi cần xe đưa đón (Lumia ⇄ Louis Wine)</span>
            </label>
            {needShuttle && (
              <div className="max-w-xs">
                <label className="label">Giờ xe đón tại sảnh Lumia</label>
                <select
                  className="input"
                  value={pickupTime}
                  onChange={(e) => setPickupOverride(e.target.value)}
                >
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
        <label className="label">Ghi chú</label>
        <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: cần ghế trẻ em, đặt trước bánh sinh nhật, chọn vang..." />
      </div>
      {error && <p className="text-sm text-wine-300 bg-wine-900/40 border border-wine-700 rounded-lg px-3 py-2">{error}</p>}
      <button className="btn-gold w-full sm:w-auto sm:justify-self-start" disabled={loading}>
        {loading ? "Đang gửi..." : "Xác nhận đặt bàn"}
      </button>
    </form>
  );
}
