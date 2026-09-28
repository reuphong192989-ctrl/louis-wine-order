import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Be_Vietnam_Pro } from "next/font/google";
import "./site.css";
import { AppProviders } from "@/components/site/AppProviders";
import { siteUrl } from "@/lib/site/constants";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam",
  weight: ["300", "400", "500", "600", "700"],
});

const DESCRIPTION =
  "Louis Wine Đà Nẵng — không gian hầm rượu sang trọng, ẩm thực Âu – Việt, hải sản tươi sống. Xem menu, đặt món mang về, đặt bàn trước. Ưu đãi riêng cho khách Lumia Apartment.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Louis Wine Đà Nẵng — Nhà hàng & Hầm rượu vang",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Louis Wine Đà Nẵng",
    title: "Louis Wine Đà Nẵng — Nhà hàng & Hầm rượu vang",
    description: DESCRIPTION,
    images: ["/images/hero-building.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#110a06",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${playfair.variable} ${beVietnam.variable}`}>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
