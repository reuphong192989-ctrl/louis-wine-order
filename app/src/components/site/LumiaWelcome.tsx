"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProviders";
import { RoomPicker } from "./RoomPicker";
import { RESTAURANT } from "@/lib/site/constants";

type Props = {
  qr: { floor: number; room: string; key: string; verified: boolean } | null;
  invalidQr: boolean;
};

export function LumiaWelcome({ qr, invalidQr }: Props) {
  const { lumia, setLumia, ready } = useApp();
  const [floor, setFloor] = useState<number | "">("");
  const [room, setRoom] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (qr?.verified) {
      setLumia({ floor: qr.floor, room: qr.room, key: qr.key, verified: true, savedAt: Date.now() });
    }
  }, [qr, setLumia]);

  const active = ready ? lumia : null;
  const showPicker = ready && (!active || editing);

  return (
    <div className="max-w-2xl mx-auto">
      {invalidQr && (
        <p className="mb-6 rounded-xl border border-wine-500 bg-wine-900/50 px-4 py-3 text-sm">
          Mã QR không hợp lệ hoặc đã bị thay đổi. Vui lòng chọn lại số phòng bên dưới hoặc gọi {RESTAURANT.hotline}.
        </p>
      )}

      {active && !editing && (
        <div className="rounded-3xl border border-gold-500/40 bg-wood-900/80 p-6 sm:p-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-500">Kính chào quý khách</p>
          <p className="font-serif text-4xl sm:text-5xl mt-3">
            Phòng <span className="gold-text">{active.room}</span>
          </p>
          <p className="text-cream/70 mt-1">Tầng {active.floor} · Lumia Apartment</p>
          {active.verified ? (
            <p className="mt-3 inline-block text-xs rounded-full border border-gold-500/50 px-3 py-1 text-gold-300">🔑 Đã xác thực qua mã QR trong phòng</p>
          ) : (
            <p className="mt-3 inline-block text-xs rounded-full border border-cream/20 px-3 py-1 text-cream/60">
              Nhân viên sẽ gọi xác minh số phòng khi nhận đơn
            </p>
          )}

          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-left">
            <Link href="/menu" className="group rounded-2xl border border-gold-500/30 bg-wood-950/70 p-5 hover:border-gold-500 transition">
              <p className="text-3xl">🛎</p>
              <p className="font-serif text-2xl mt-2 group-hover:text-gold-300">Đặt món về phòng</p>
              <p className="text-sm text-cream/70 mt-1">
                <b className="text-gold-300">-10% hoá đơn</b> · <b className="text-gold-300">Free ship</b> · giao tận cửa phòng {active.room}
              </p>
              <p className="mt-4 text-sm text-gold-400">Xem thực đơn →</p>
            </Link>
            <Link href="/#dat-ban" className="group rounded-2xl border border-gold-500/30 bg-wood-950/70 p-5 hover:border-gold-500 transition">
              <p className="text-3xl">🚐</p>
              <p className="font-serif text-2xl mt-2 group-hover:text-gold-300">Đặt bàn tại nhà hàng</p>
              <p className="text-sm text-cream/70 mt-1">
                <b className="text-gold-300">-10% hoá đơn</b> · <b className="text-gold-300">Xe đưa đón miễn phí</b> tại sảnh Lumia
              </p>
              <p className="mt-4 text-sm text-gold-400">Đặt bàn ngay →</p>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="btn-outline !py-2">☎ Gọi {RESTAURANT.hotline}</a>
            {!active.verified && (
              <button className="btn-outline !py-2" onClick={() => setEditing(true)}>Đổi số phòng</button>
            )}
            <button
              className="text-cream/40 hover:text-cream/70 underline underline-offset-4"
              onClick={() => {
                setLumia(null);
                setEditing(false);
              }}
            >
              Tôi đã trả phòng
            </button>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="rounded-3xl border border-gold-500/30 bg-wood-900/80 p-6 sm:p-8">
          <p className="font-serif text-3xl">Xác nhận phòng của bạn</p>
          <p className="text-cream/60 text-sm mt-2">
            Cách nhanh nhất là <b className="text-gold-300">quét mã QR dán trong phòng</b>. Nếu không quét được, vui lòng chọn chính xác
            tầng và số phòng để nhân viên phục vụ tận nơi.
          </p>
          <div className="mt-6">
            <RoomPicker
              floor={floor}
              room={room}
              onChange={(f, r) => {
                setFloor(f);
                setRoom(r);
              }}
            />
          </div>
          <button
            className="btn-gold mt-6 w-full"
            disabled={!floor || !room}
            onClick={() => {
              if (!floor || !room) return;
              setLumia({ floor, room, key: null, verified: false, savedAt: Date.now() });
              setEditing(false);
            }}
          >
            Xác nhận Tầng {floor || "?"} · Phòng {room || "???"}
          </button>
        </div>
      )}
    </div>
  );
}
