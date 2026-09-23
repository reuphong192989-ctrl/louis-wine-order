"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/items", label: "Món ăn" },
  { href: "/admin/reports", label: "Doanh thu" },
  { href: "/admin/table-log", label: "Nhật ký bàn" },
  { href: "/admin/table-names", label: "Đổi tên bàn" },
  { href: "/admin/staff-review", label: "Đánh giá nhân viên" },
  { href: "/admin/users", label: "Tài khoản" },
];

const OWNER_LINKS = [{ href: "/admin/orders", label: "Đơn hàng" }];

export default function AdminNav({ username, role }: { username: string; role: "OWNER" | "ADMIN" }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "OWNER" ? [...LINKS, ...OWNER_LINKS] : LINKS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="order-header">
      <div className="order-logo">LOUIS WINE</div>
      <h3 style={{ margin: 0 }}>Quản trị</h3>
      <nav style={{ display: "flex", gap: 4 }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`btn ${pathname?.startsWith(l.href) ? "btn-primary" : "btn-secondary"}`}
          >
            {l.label}
          </Link>
        ))}
        <Link href="/staff" className="btn btn-secondary">
          Màn hình nhân viên
        </Link>
        <Link href="/kitchen" className="btn btn-secondary">
          Màn hình bếp
        </Link>
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <span className="text-muted" style={{ fontSize: 13 }}>{username}</span>
        <button className="btn btn-secondary" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
