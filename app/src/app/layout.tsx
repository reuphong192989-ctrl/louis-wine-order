import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Louis Wine — Menu Tự Order",
  description: "Menu tự order Louis Wine — Đà Nẵng",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
