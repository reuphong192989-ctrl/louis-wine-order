import type { MetadataRoute } from "next";

/**
 * Lets Android Chrome install the internal screens (gọi món / nhân viên / bếp /
 * lễ tân / quản trị) as a real app (WebAPK) instead of a plain home-screen
 * shortcut. Without a manifest, "Add to Home Screen" only creates a launcher
 * shortcut — Android's shortcut-pinning is flaky and can report success while
 * silently not placing the icon, especially right after deleting a previous
 * shortcut with the same target. A WebAPK is a real installed package, so
 * delete/reinstall behaves like any other Android app. (manifest.ts is a
 * root-app-directory-only convention in Next.js — it can't be scoped to the
 * (noi-bo) route group the way icon.png can.)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Louis Wine — Nội bộ",
    short_name: "Louis Wine",
    description: "Màn hình gọi món / nhân viên / bếp / lễ tân / quản trị — Louis Wine Đà Nẵng",
    start_url: "/staff",
    scope: "/",
    display: "standalone",
    background_color: "#f7f3ee",
    theme_color: "#7c2128",
    icons: [{ src: "/images/logo.png", sizes: "256x256", type: "image/png" }],
  };
}
