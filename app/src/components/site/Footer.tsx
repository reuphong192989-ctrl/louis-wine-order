import Link from "next/link";
import { RESTAURANT } from "@/lib/site/constants";

export function Footer() {
  return (
    <footer className="no-print border-t border-gold-500/15 bg-wood-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Logo Louis Wine" width={56} height={56} className="h-14 w-14" />
            <p className="font-serif text-3xl gold-text">Louis Wine</p>
          </div>
          <p className="mt-3 text-cream/60 max-w-md text-sm leading-relaxed">
            Nhà hàng & hầm rượu vang giữa lòng Đà Nẵng — ẩm thực Âu – Việt, hải sản tươi sống, bộ sưu tập vang nhập khẩu
            và không gian phòng VIP ấm cúng bằng gỗ.
          </p>
        </div>
        <div className="text-sm space-y-2">
          <p className="text-gold-400 font-semibold mb-3">Liên hệ</p>
          <p className="text-cream/70">{RESTAURANT.address}</p>
          <p>
            <a href={`tel:${RESTAURANT.hotlineRaw}`} className="text-cream/70 hover:text-gold-300">
              Hotline: {RESTAURANT.hotline}
            </a>
          </p>
          <p className="text-cream/70">Mở cửa: {RESTAURANT.hours}</p>
        </div>
        <div className="text-sm space-y-2">
          <p className="text-gold-400 font-semibold mb-3">Khám phá</p>
          <Link href="/menu" className="block text-cream/70 hover:text-gold-300">Thực đơn & đặt món</Link>
          <Link href="/#dat-ban" className="block text-cream/70 hover:text-gold-300">Đặt bàn trước</Link>
          <Link href="/#lumia" className="block text-cream/70 hover:text-gold-300">Ưu đãi Lumia Apartment</Link>
          <Link href="/#danh-gia" className="block text-cream/70 hover:text-gold-300">Đánh giá</Link>
          <Link href="/admin" className="block text-cream/40 hover:text-gold-300">Dành cho nhân viên</Link>
        </div>
      </div>
      <div className="divider-gold" />
      <p className="text-center text-xs text-cream/40 py-5">© {new Date().getFullYear()} Louis Wine Đà Nẵng. All rights reserved.</p>
    </footer>
  );
}
