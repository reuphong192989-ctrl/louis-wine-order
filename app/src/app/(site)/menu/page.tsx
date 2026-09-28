import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MenuOrder } from "@/components/site/MenuOrder";
import { getMenu } from "@/lib/site/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thực đơn & Đặt món — Louis Wine Đà Nẵng" };

export default async function MenuPage() {
  const menu = await getMenu();
  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="relative h-48 sm:h-60 overflow-hidden mb-6">
          <img src="/images/dining-room.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-wood-950 to-wood-950/30" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 h-full flex flex-col justify-end pb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-gold-500">Louis Wine</p>
            <h1 className="font-serif text-4xl sm:text-5xl mt-2">Thực đơn & Đặt món</h1>
            <p className="text-cream/60 mt-2 text-sm">Đặt mang về · Giao tận nơi · Giao về phòng Lumia Apartment</p>
          </div>
        </div>
        <MenuOrder menu={menu} />
      </main>
      <Footer />
    </>
  );
}
