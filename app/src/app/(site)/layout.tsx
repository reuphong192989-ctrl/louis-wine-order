import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Be_Vietnam_Pro } from "next/font/google";
import "./site.css";
import { AppProviders } from "@/components/site/AppProviders";
import { siteUrl } from "@/lib/site/constants";
import { getDict, getLang } from "@/lib/site/lang-server";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese", "cyrillic"],
  variable: "--font-playfair",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});
// Be Vietnam Pro has no Cyrillic glyphs; Russian body text falls back to the system sans-serif.
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam",
  weight: ["300", "400", "500", "600", "700"],
});

const OG_LOCALE = { en: "en_US", ru: "ru_RU", vi: "vi_VN" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getDict();
  return {
    metadataBase: new URL(siteUrl()),
    title: t.meta.title,
    description: t.meta.description,
    openGraph: {
      type: "website",
      locale: OG_LOCALE[lang],
      siteName: "Louis Wine Đà Nẵng",
      title: t.meta.title,
      description: t.meta.description,
      images: ["/images/hero-building.jpg"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#110a06",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${playfair.variable} ${beVietnam.variable}`}>
      <body className="font-sans antialiased">
        <AppProviders lang={lang}>{children}</AppProviders>
      </body>
    </html>
  );
}
