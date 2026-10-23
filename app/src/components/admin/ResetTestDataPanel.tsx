"use client";

import { useEffect, useState } from "react";

type TabCount = { tab: string; label: string; count: number };

/**
 * "Đặt lại dữ liệu trước khai trương" — OWNER-only. Empties every order, bill, cancellation/return, staff
 * call, reservation, table-switch log and review in one go, so the menu can start recording real revenue
 * with a clean slate after testing. Separate from the bulk-delete-by-date tool above (which only touches
 * Orders): that one can leave test Bills/CancelledItems/etc. behind, which is exactly what this is for.
 * The menu, accounts, table names and bank settings are never touched.
 */
export default function ResetTestDataPanel() {
  const [tabs, setTabs] = useState<TabCount[] | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<TabCount[] | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/reset-test-data");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Không tải được dữ liệu.");
      return;
    }
    setTabs(data.tabs);
    setConfirmPhrase(data.confirmPhrase);
  }

  useEffect(() => {
    load();
  }, []);

  const total = tabs?.reduce((s, t) => s + t.count, 0) ?? 0;

  async function doReset() {
    if (typed !== confirmPhrase) return;
    if (!confirm(`XÁC NHẬN LẦN CUỐI: xoá vĩnh viễn toàn bộ ${total} dòng dữ liệu liệt kê bên dưới?\n\nKhông thể hoàn tác. Thực đơn, tài khoản, tên bàn và tài khoản ngân hàng sẽ được giữ nguyên.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: typed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Không xoá được dữ liệu.");
      setDone(data.deleted);
      setTyped("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--color-neutral-100)",
        border: "2px solid var(--color-accent)",
        padding: "var(--space-3)",
      }}
    >
      <h3 style={{ margin: 0 }}>Đặt lại dữ liệu trước khai trương</h3>
      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
        Xoá <strong style={{ color: "var(--color-accent)" }}>vĩnh viễn, không thể hoàn tác</strong> toàn bộ đơn hàng, hoá
        đơn, huỷ/trả món, gọi nhân viên, đặt bàn, nhật ký chuyển bàn và đánh giá — kể cả những gì công cụ
        &quot;Xoá hàng loạt&quot; ở trên không xoá tới (hoá đơn, huỷ món...). Dùng khi chạy thử xong và muốn báo
        cáo doanh thu bắt đầu lại từ số 0. <strong>Thực đơn, tài khoản, tên bàn, tài khoản ngân hàng được giữ nguyên.</strong>
      </p>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}

      {done && (
        <div style={{ fontSize: 13, background: "var(--color-accent-100)", padding: "var(--space-2)" }}>
          Đã xoá xong: {done.map((t) => `${t.label} (${t.count})`).join(", ")}.
        </div>
      )}

      {tabs && (
        <table className="table" style={{ maxWidth: 420 }}>
          <tbody>
            {tabs.map((t) => (
              <tr key={t.tab}>
                <td>{t.label}</td>
                <td style={{ textAlign: "right", fontWeight: t.count > 0 ? 700 : undefined }}>{t.count} dòng</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 800 }}>Tổng cộng</td>
              <td style={{ textAlign: "right", fontWeight: 800 }}>{total} dòng</td>
            </tr>
          </tbody>
        </table>
      )}

      {total === 0 ? (
        <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
          Không có dữ liệu nào để xoá.
        </p>
      ) : (
        <div className="field" style={{ maxWidth: 420 }}>
          <label>
            Gõ chính xác <code>{confirmPhrase}</code> để xác nhận
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-danger" disabled={busy || typed !== confirmPhrase} onClick={doReset}>
              {busy ? "Đang xoá..." : "Xoá vĩnh viễn"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
