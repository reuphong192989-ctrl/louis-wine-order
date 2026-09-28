import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findOrderByCode } from "@/lib/sheets/orders";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AutoRefresh } from "@/components/site/AutoRefresh";
import { formatVnd } from "@/lib/site/pricing";
import { CHANNEL_LABEL, RESTAURANT } from "@/lib/site/constants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const STEPS = ["Đã nhận đơn", "Đã xác nhận", "Bếp đang làm", "Món đã xong"];

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const o = await findOrderByCode(code);
  if (!o || !o.online) notFound();
  const on = o.online;

  const cancelled = o.status === "CANCELLED";
  const allDone = o.items.length > 0 && o.items.every((i) => i.kitchenStatus === "DONE");
  const cooking = o.items.some((i) => i.kitchenStatus !== "PENDING");
  const step = o.status === "PENDING" ? 0 : allDone ? 3 : cooking ? 2 : 1;

  return (
    <>
      <Header />
      <AutoRefresh />
      <main className="pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto rounded-3xl border border-gold-500/30 bg-wood-900/80 p-6 sm:p-8">
          <div className="text-center">
            <p className="text-5xl">{cancelled ? "⚠️" : "🍽"}</p>
            <h1 className="font-serif text-3xl sm:text-4xl mt-3 gold-text">{cancelled ? "Đơn hàng đã huỷ" : "Cảm ơn quý khách!"}</h1>
            <p className="text-cream/70 mt-2">
              Mã đơn: <span className="font-mono text-gold-300 text-lg">{on.code}</span>
            </p>
          </div>

          {!cancelled && (
            <ol className="mt-8 flex justify-between gap-1">
              {STEPS.map((s, i) => (
                <li key={s} className="flex-1 text-center">
                  <div className={`mx-auto h-3 w-3 rounded-full ${i <= step ? "bg-gold-400 shadow-[0_0_12px_#c9a14a]" : "bg-cream/15"}`} />
                  <p className={`text-[11px] mt-2 ${i <= step ? "text-gold-300" : "text-cream/40"}`}>{s}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-8 rounded-2xl bg-wood-950/70 p-5 text-sm space-y-2">
            <p><span className="text-cream/50">Hình thức:</span> {CHANNEL_LABEL[on.channel]}</p>
            <p><span className="text-cream/50">Khách hàng:</span> {on.customerName} · {on.phone}</p>
            {on.channel === "LUMIA_ROOM" && <p className="text-gold-300 font-semibold text-base">🛎 {on.address}</p>}
            {on.channel === "DELIVERY" && <p><span className="text-cream/50">Địa chỉ:</span> {on.address}</p>}
            {on.scheduledTime && <p><span className="text-cream/50">Thời gian:</span> {on.scheduledTime}</p>}
            {o.note && <p><span className="text-cream/50">Ghi chú:</span> {o.note}</p>}
          </div>

          <ul className="mt-6 divide-y divide-gold-500/10 text-sm">
            {o.items.map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-3">
                <span>{l.qty} × {l.nameSnapshot}</span>
                <span>{formatVnd(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-cream/60">Tạm tính</span><span>{formatVnd(on.subtotal)}</span></div>
            {on.discount > 0 && <div className="flex justify-between text-gold-300"><span>Ưu đãi Lumia (-10%)</span><span>-{formatVnd(on.discount)}</span></div>}
            <div className="flex justify-between">
              <span className="text-cream/60">Phí giao hàng</span>
              <span>{on.channel === "LUMIA_ROOM" ? "Miễn phí" : formatVnd(on.shippingFee)}</span>
            </div>
            <div className="divider-gold my-2" />
            <div className="flex justify-between text-xl font-semibold"><span>Tổng cộng</span><span className="gold-text">{formatVnd(o.totalAmount)}</span></div>
          </div>

          <p className="mt-6 text-center text-sm text-cream/60">
            Nhân viên sẽ gọi xác nhận trong ít phút. Cần hỗ trợ? Gọi{" "}
            <a className="text-gold-300" href={`tel:${RESTAURANT.hotlineRaw}`}>{RESTAURANT.hotline}</a>
          </p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link href="/menu" className="btn-outline">Đặt thêm món</Link>
            <Link href="/#danh-gia" className="btn-gold">Đánh giá Louis Wine</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
