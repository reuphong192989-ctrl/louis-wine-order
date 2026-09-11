"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ title, redirectTo }: { title: string; redirectTo: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Đăng nhập thất bại.");
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          background: "var(--color-neutral-100)",
          border: "1px solid var(--color-divider)",
          padding: "var(--space-6)",
        }}
      >
        <div>
          <div style={{ font: "800 20px var(--font-heading)", color: "var(--color-accent)", letterSpacing: "0.04em" }}>
            LOUIS WINE
          </div>
          <div className="text-muted" style={{ fontSize: 10 }}>
            Phát triển bởi Thành IT · 0382821682
          </div>
        </div>
        <h3 style={{ margin: "0 0 8px" }}>{title}</h3>

        <div className="field">
          <label>Tên đăng nhập</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label>Mật khẩu</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <div style={{ fontSize: 13, color: "var(--color-accent)" }}>{error}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
