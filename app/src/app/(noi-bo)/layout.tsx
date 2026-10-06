import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Louis Wine — Menu Tự Order",
  description: "Menu tự order Louis Wine — Đà Nẵng",
  // Staff/kitchen/admin screens and the in-restaurant QR menu are not for search engines.
  robots: { index: false, follow: false },
  // Without this, "Add to Home Screen" on iOS just bookmarks the page instead of
  // launching it standalone — the icon can then behave unreliably (missing after
  // delete+re-add, generic thumbnail), and push notifications need standalone
  // mode to work at all on iOS Safari (see src/lib/use-push.ts isStandalone()).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Louis Wine",
  },
  // Next only emits the newer "mobile-web-app-capable" from appleWebApp.capable —
  // iOS Safari still needs this exact legacy key to actually go standalone.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c2128",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
