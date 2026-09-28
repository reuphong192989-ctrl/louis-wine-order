"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "./AppProviders";
import { AddToCartButton } from "./AddToCartButton";
import { RoomPicker } from "./RoomPicker";
import type { MenuCategoryDTO } from "@/lib/site/queries";
import { computeTotals, formatVnd, type OnlineChannel } from "@/lib/site/pricing";
import { DELIVERY_FEE } from "@/lib/site/constants";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function MenuOrder({ menu }: { menu: MenuCategoryDTO[] }) {
  const { cart, cartCount, cartSubtotal, setQty, clearCart, lumia, ready } = useApp();
  const router = useRouter();
  const [active, setActive] = useState<string>("all");
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(false);

  const [orderType, setOrderType] = useState<OnlineChannel>("PICKUP");
  const [floor, setFloor] = useState<number | "">("");
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [when, setWhen] = useState("Càng sớm càng tốt");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && lumia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage-backed Lumia session after hydration
      setOrderType("LUMIA_ROOM");
      setFloor(lumia.floor);
      setRoom(lumia.room);
    }
  }, [ready, lumia]);

  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#gio-hang") setDrawer(true);
    };
    check();
    // Header cart icon fires this when clicked; Next.js same-page hash links don't emit "hashchange"
    const open = () => setDrawer(true);
    window.addEventListener("louis:open-cart", open);
    return () => window.removeEventListener("louis:open-cart", open);
  }, []);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    return menu
      .filter((c) => active === "all" || c.slug === active)
      .map((c) => ({
        ...c,
        items: nq ? c.items.filter((i) => normalize(i.name + " " + (i.note ?? "")).includes(nq)) : c.items,
      }))
      .filter((c) => c.items.length);
  }, [menu, active, q]);

  function closeDrawer() {
    setDrawer(false);
    if (window.location.hash === "#gio-hang") history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const totals = computeTotals(cartSubtotal, orderType);
  const locked = !!(lumia?.verified && orderType === "LUMIA_ROOM" && floor === lumia.floor && room === lumia.room);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!cart.length) return setError("Giỏ hàng đang trống.");
    if (orderType === "LUMIA_ROOM" && (!floor || !room)) return setError("Vui lòng chọn chính xác tầng và số phòng.");
    setLoading(true);
    try {
      const res = await fetch("/api/online-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: orderType,
          customerName: name,
          phone,
          address,
          floor,
          room,
          lumiaKey: lumia && lumia.room === room ? lumia.key : null,
          scheduledTime: when,
          note,
          items: cart.map((c) => ({ itemId: c.itemId, qty: c.qty })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Có lỗi xảy ra");
      clearCart();
      router.push(`/don-hang/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setLoading(false);
    }
  }

  const cartPanel = (
    <div id="gio-hang" className="rounded-2xl border border-gold-500/25 bg-wood-900/90 backdrop-blur flex flex-col max-h-[calc(100svh-7rem)]">
      <div className="p-5 border-b border-gold-500/15 flex items-center justify-between">
        <p className="font-serif text-2xl">Giỏ hàng <span className="text-gold-400 text-lg">({cartCount})</span></p>
        <button className="lg:hidden text-2xl text-cream/60" onClick={closeDrawer} aria-label="Đóng">✕</button>
      </div>
      <div className="overflow-y-auto flex-1">
        {cart.length === 0 ? (
          <p className="p-6 text-center text-cream/50 text-sm">Chưa có món nào. Hãy chọn món từ thực đơn nhé!</p>
        ) : (
          <ul className="divide-y divide-gold-500/10">
            {cart.map((l) => (
              <li key={l.itemId} className="flex gap-3 p-4">
                {l.imageUrl ? (
                  <img src={l.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-wood-800 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{l.name}</p>
                  <p className="text-xs text-gold-300 mt-0.5">{formatVnd(l.price)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="h-7 w-7 rounded-full border border-gold-500/40" onClick={() => setQty(l.itemId, l.qty - 1)}>−</button>
                    <span className="w-6 text-center text-sm">{l.qty}</span>
                    <button className="h-7 w-7 rounded-full border border-gold-500/40" onClick={() => setQty(l.itemId, l.qty + 1)}>+</button>
                    <span className="ml-auto text-sm font-semibold">{formatVnd(l.price * l.qty)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {cart.length > 0 && (
          <form onSubmit={submit} className="p-5 border-t border-gold-500/15 grid gap-3">
            <p className="label !mb-0">Hình thức nhận món</p>
            <div className="grid gap-2">
              {(
                [
                  ["LUMIA_ROOM", "🛎 Giao về phòng Lumia Apartment", "Giảm 10% · Miễn phí ship"],
                  ["DELIVERY", "🛵 Giao tận nơi", `Phí giao tạm tính ${formatVnd(DELIVERY_FEE)}`],
                  ["PICKUP", "🛍 Tự đến lấy tại nhà hàng", "Không mất phí"],
                ] as const
              ).map(([v, t, d]) => (
                <label
                  key={v}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    orderType === v ? "border-gold-500 bg-gold-500/10" : "border-gold-500/20"
                  }`}
                >
                  <input type="radio" name="otype" className="mt-1 accent-[#c9a14a]" checked={orderType === v} onChange={() => setOrderType(v)} />
                  <span>
                    <span className="block text-sm font-medium">{t}</span>
                    <span className={`block text-xs ${v === "LUMIA_ROOM" ? "text-gold-300" : "text-cream/50"}`}>{d}</span>
                  </span>
                </label>
              ))}
            </div>

            {orderType === "LUMIA_ROOM" && (
              <div className="grid gap-2">
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
                    Vui lòng chọn đúng tầng & phòng để nhân viên giao tận cửa. Quét QR trong phòng để điền tự động.
                  </p>
                )}
              </div>
            )}

            <input className="input" placeholder="Họ và tên *" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="input" placeholder="Số điện thoại *" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            {orderType === "DELIVERY" && (
              <textarea className="input min-h-16" placeholder="Địa chỉ giao hàng *" value={address} onChange={(e) => setAddress(e.target.value)} required />
            )}
            <select className="input" value={when} onChange={(e) => setWhen(e.target.value)}>
              <option>Càng sớm càng tốt</option>
              {["11:00", "11:30", "12:00", "12:30", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"].map((t) => (
                <option key={t} value={`Lúc ${t}`}>
                  {orderType === "PICKUP" ? "Đến lấy" : "Nhận"} lúc {t}
                </option>
              ))}
            </select>
            <textarea className="input min-h-16" placeholder="Ghi chú (cách chế biến, ít cay, dụng cụ ăn...)" value={note} onChange={(e) => setNote(e.target.value)} />

            <div className="rounded-xl bg-wood-950/70 p-4 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-cream/60">Tạm tính</span><span>{formatVnd(totals.subtotal)}</span></div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-gold-300"><span>Ưu đãi Lumia (-10%)</span><span>-{formatVnd(totals.discount)}</span></div>
              )}
              <div className="flex justify-between">
                <span className="text-cream/60">Phí giao hàng</span>
                <span>{orderType === "LUMIA_ROOM" ? <span className="text-gold-300">Miễn phí</span> : formatVnd(totals.shippingFee)}</span>
              </div>
              <div className="divider-gold my-2" />
              <div className="flex justify-between text-lg font-semibold"><span>Tổng cộng</span><span className="gold-text">{formatVnd(totals.total)}</span></div>
            </div>
            {error && <p className="text-sm text-wine-300 bg-wine-900/40 border border-wine-700 rounded-lg px-3 py-2">{error}</p>}
            <button className="btn-gold w-full" disabled={loading}>{loading ? "Đang gửi đơn..." : "Đặt món ngay"}</button>
            <p className="text-[11px] text-cream/40 text-center">Thanh toán khi nhận hàng (tiền mặt / chuyển khoản)</p>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-28 lg:pb-16">
      {ready && lumia && (
        <div className="mb-6 rounded-2xl border border-gold-500/40 bg-gradient-to-r from-wine-900/80 to-wood-900/80 p-4 sm:p-5 flex flex-wrap items-center gap-3 justify-between">
          <p>
            <span className="text-gold-300 font-semibold">Xin chào khách phòng {lumia.room} (Tầng {lumia.floor})</span>
            <span className="block text-sm text-cream/70">Đơn giao về phòng được giảm 10% và miễn phí ship.</span>
          </p>
          <Link href="/#dat-ban" className="btn-outline !py-2 text-sm">Đặt bàn + xe đón</Link>
        </div>
      )}

      <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-wood-950/95 backdrop-blur border-b border-gold-500/10">
        <input className="input mb-3" placeholder="🔍  Tìm món: bò, cua, lẩu, vang..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[{ slug: "all", name: "Tất cả" }, ...menu].map((c) => (
            <button
              key={c.slug}
              onClick={() => setActive(c.slug)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm border transition ${
                active === c.slug ? "bg-gold-500 text-wood-950 border-gold-500 font-semibold" : "border-gold-500/25 text-cream/75 hover:border-gold-500/60"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="space-y-12">
          {filtered.length === 0 && <p className="text-center text-cream/50 py-16">Không tìm thấy món phù hợp.</p>}
          {filtered.map((c) => (
            <section key={c.slug}>
              <h2 className="font-serif text-3xl flex items-center gap-4">
                {c.name}
                <span className="flex-1 divider-gold" />
                <span className="text-sm text-cream/40 font-sans">{c.items.length} món</span>
              </h2>
              <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {c.items.map((it) => (
                  <article key={it.id} className="flex sm:flex-col gap-3 sm:gap-0 rounded-2xl overflow-hidden border border-gold-500/15 bg-wood-900/60">
                    <div className="relative w-28 sm:w-full shrink-0 aspect-square sm:aspect-[4/3] overflow-hidden bg-wood-800">
                      {it.imageUrl && <img src={it.imageUrl} alt={it.name} loading="lazy" className="h-full w-full object-cover" />}
                      {it.isSpecial && <span className="absolute top-2 left-2 rounded-full bg-wine-600 px-2 py-0.5 text-[10px] uppercase">Đặc biệt</span>}
                      {!it.isSpecial && it.isHighlight && (
                        <span className="absolute top-2 left-2 rounded-full bg-gold-500 text-wood-950 px-2 py-0.5 text-[10px] uppercase font-semibold">Nổi bật</span>
                      )}
                    </div>
                    <div className="py-3 pr-3 sm:p-4 flex flex-col flex-1 min-w-0">
                      <p className="font-medium leading-snug">{it.name}</p>
                      {it.note && <p className="text-xs text-cream/50 mt-1 line-clamp-3">{it.note}</p>}
                      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                        <p className="text-gold-300 font-semibold text-sm">{it.priceText}</p>
                        <AddToCartButton item={it} compact />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="hidden lg:block sticky top-44">{cartPanel}</aside>
      </div>

      {/* Mobile cart bar + drawer */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-wood-950/95 border-t border-gold-500/20 backdrop-blur">
        <button className="btn-gold w-full justify-between" onClick={() => setDrawer(true)}>
          <span>🛍 Giỏ hàng ({cartCount})</span>
          <span>{formatVnd(totals.total)}</span>
        </button>
      </div>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 flex items-end" onClick={closeDrawer}>
          <div className="w-full p-2" onClick={(e) => e.stopPropagation()}>
            {cartPanel}
          </div>
        </div>
      )}
    </div>
  );
}
