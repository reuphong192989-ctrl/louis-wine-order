"use client";

import { useEffect, useState } from "react";

type TabResult = { tab: string; rows: number; skipped?: string };

const TAB_LABEL: Record<string, string> = {
  Categories: "Danh mục",
  MenuItems: "Món ăn",
  Orders: "Đơn hàng",
  OrderItems: "Chi tiết món trong đơn",
  StaffCalls: "Gọi nhân viên",
  StaffIncidents: "Sự cố nhân viên",
  TableNames: "Tên bàn",
  TableSwitchLog: "Nhật ký đổi bàn",
  Users: "Tài khoản",
};

export default function DataMigrationManager() {
  const [backend, setBackend] = useState<string | null>(null);
  const [counts, setCounts] = useState<TabResult[] | null>(null);
  const [results, setResults] = useState<TabResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/admin/migrate-postgres", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được trạng thái PostgreSQL.");
      setBackend(data.backend);
      setCounts(data.postgres);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function migrate(force: boolean) {
    const msg = force
      ? "Xoá toàn bộ dữ liệu đang có trong PostgreSQL và chép lại từ Google Sheets?"
      : "Chép toàn bộ dữ liệu từ Google Sheets sang PostgreSQL? (Google Sheets không bị thay đổi.)";
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/admin/migrate-postgres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chép dữ liệu thất bại.");
      setResults(data.results);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const hasData = counts?.some((c) => c.rows > 0) ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 720 }}>
      <h3 style={{ margin: 0 }}>Dữ liệu — chuyển Google Sheets sang PostgreSQL</h3>
      <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
        Đang lưu dữ liệu tại: <b>{backend === "postgres" ? "PostgreSQL" : backend ? "Google Sheets" : "…"}</b>. Nút bên dưới
        chép thực đơn, đơn hàng, tài khoản và nhật ký sang PostgreSQL rồi đếm lại từng bảng. Google Sheets chỉ được đọc,
        không bị sửa. Sau khi chép xong, đặt <code>DATA_BACKEND=postgres</code> trên Vercel và deploy lại để chuyển hẳn.
      </p>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Bảng</th>
            <th>Đang có trong PostgreSQL</th>
            {results && <th>Vừa chép</th>}
          </tr>
        </thead>
        <tbody>
          {(counts ?? []).map((c) => {
            const r = results?.find((x) => x.tab === c.tab);
            return (
              <tr key={c.tab}>
                <td>{TAB_LABEL[c.tab] ?? c.tab}</td>
                <td>{c.rows}</td>
                {results && <td className={r?.skipped ? "text-muted" : undefined}>{r?.skipped ? "Bỏ qua (tab chưa có)" : `✓ ${r?.rows ?? 0}`}</td>}
              </tr>
            );
          })}
          {!counts && !error && (
            <tr>
              <td colSpan={3} className="text-muted">
                Đang tải...
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {backend !== "postgres" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" disabled={busy || !counts || hasData} onClick={() => migrate(false)}>
            {busy ? "Đang chép..." : "Chép dữ liệu sang PostgreSQL"}
          </button>
          {hasData && (
            <button className="btn btn-secondary" disabled={busy} onClick={() => migrate(true)}>
              Xoá và chép đè lại
            </button>
          )}
        </div>
      )}
    </div>
  );
}
