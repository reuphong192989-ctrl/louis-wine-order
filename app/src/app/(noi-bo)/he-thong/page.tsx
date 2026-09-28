import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-6)",
        padding: "var(--space-6)",
        textAlign: "center",
      }}
    >
      <div>
        <div
          style={{
            font: "800 26px var(--font-heading)",
            color: "var(--color-accent)",
            letterSpacing: "0.04em",
          }}
        >
          LOUIS WINE
        </div>
        <p className="text-muted" style={{ marginTop: 4 }}>
          Menu tự order — Đà Nẵng
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: 280 }}>
        <Link href="/order?table=01" className="btn btn-primary btn-block">
          Menu tự order (khách hàng)
        </Link>
        <Link href="/staff" className="btn btn-secondary btn-block">
          Màn hình nhân viên
        </Link>
        <Link href="/admin" className="btn btn-secondary btn-block">
          Quản trị
        </Link>
      </div>
    </main>
  );
}
