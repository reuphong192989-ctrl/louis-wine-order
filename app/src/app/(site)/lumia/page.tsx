import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LumiaWelcome } from "@/components/site/LumiaWelcome";
import { parseRoom } from "@/lib/site/lumia";
import { verifyRoomKey } from "@/lib/site/lumia-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Khách Lumia Apartment — Louis Wine" };

export default async function LumiaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const roomParam = typeof sp.room === "string" ? sp.room : null;
  const key = typeof sp.k === "string" ? sp.k : null;

  let qr: { floor: number; room: string; key: string; verified: boolean } | null = null;
  let invalidQr = false;
  if (roomParam) {
    const parsed = parseRoom(roomParam);
    if (parsed && key && verifyRoomKey(parsed.room, key)) {
      qr = { ...parsed, key, verified: true };
    } else {
      invalidQr = true;
    }
  }

  return (
    <>
      <Header />
      <main className="relative min-h-[100svh] pt-32 pb-20">
        <img src="/images/lumia-apartment.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-b from-wine-900/60 via-wood-950/95 to-wood-950" />
        <div className="relative px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.35em] text-gold-500">Louis Wine × Lumia Apartment</p>
            <h1 className="font-serif text-4xl sm:text-5xl mt-3">Đặc quyền khách lưu trú</h1>
            <p className="text-cream/60 mt-3 max-w-lg mx-auto">
              Giảm 10% mọi hoá đơn · Miễn phí giao món về phòng · Xe đưa đón miễn phí khi dùng bữa tại nhà hàng (5km)
            </p>
          </div>
          <LumiaWelcome qr={qr} invalidQr={invalidQr} />
        </div>
      </main>
      <Footer />
    </>
  );
}
