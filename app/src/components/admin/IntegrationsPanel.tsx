"use client";

import { useEffect, useState } from "react";

type Status = { sheets: boolean; cron: boolean; telegram: boolean; telegramLumia: boolean; qrSecret: boolean };

const ROWS: { key: keyof Status; label: string; hint: string }[] = [
  { key: "sheets", label: "Google Sheets (báo cáo)", hint: "GOOGLE_SHEET_ID + tài khoản dịch vụ" },
  { key: "cron", label: "Tự xuất báo cáo 23:30 mỗi ngày", hint: "CRON_SECRET" },
  { key: "telegram", label: "Telegram nhóm nhà hàng", hint: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID" },
  { key: "telegramLumia", label: "Telegram nhóm lễ tân Lumia", hint: "TELEGRAM_LUMIA_CHAT_ID" },
  { key: "qrSecret", label: "Khoá ký mã QR phòng Lumia", hint: "LUMIA_QR_SECRET" },
];

/** Quản trị → Dữ liệu: integration status, "export report now" and a Telegram test. */
export default function IntegrationsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/integrations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function run(kind: "export" | "telegram") {
    setBusy(kind);
    setMsg(null);
    try {
      const res = await fetch(kind === "export" ? "/api/admin/export-sheets" : "/api/admin/integrations", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Thao tác thất bại.");
      setMsg({
        ok: true,
        text:
          kind === "export"
            ? `Đã xuất báo cáo: ${data.orders} đơn, ${data.reservations} lượt đặt bàn, ${data.reviews} đánh giá → tab BaoCao_DonHang / BaoCao_DatBan / BaoCao_DanhGia.`
            : `Đã gửi tin thử tới nhóm nhà hàng${data.lumia ? " và nhóm lễ tân Lumia" : ""}. Kiểm tra Telegram.`,
      });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 720 }}>
      <h3 style={{ margin: 0 }}>Kết nối &amp; báo cáo</h3>
      <table className="table">
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key}>
              <td>{r.label}</td>
              <td className="text-muted" style={{ fontSize: 12 }}>
                {r.hint}
              </td>
              <td style={{ fontWeight: 700, color: status?.[r.key] ? "var(--color-accent-2-700)" : "var(--color-accent)" }}>
                {status ? (status[r.key] ? "✓ Đã cấu hình" : "Chưa cấu hình") : "…"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
        Báo cáo ghi vào 3 tab riêng trong Google Sheet cũ (không đụng tới các tab dữ liệu cũ). Mỗi lần xuất sẽ ghi đè toàn bộ 3 tab báo
        cáo bằng số liệu mới nhất.
      </p>
      {msg && <div style={{ fontSize: 13, color: msg.ok ? "var(--color-accent-2-700)" : "var(--color-accent)" }}>{msg.text}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={busy !== null || !status?.sheets} onClick={() => run("export")}>
          {busy === "export" ? "Đang xuất..." : "Xuất báo cáo sang Google Sheets ngay"}
        </button>
        <button className="btn btn-secondary" disabled={busy !== null || !status?.telegram} onClick={() => run("telegram")}>
          {busy === "telegram" ? "Đang gửi..." : "Gửi thử Telegram"}
        </button>
      </div>
    </div>
  );
}
