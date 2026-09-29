"use client";

import { useEffect, useState } from "react";

type Status = {
  sheets: boolean;
  cron: boolean;
  telegram: boolean;
  telegramLumia: boolean;
  qrSecret: boolean;
  googleKey: boolean;
  googlePlace: boolean;
};

type PlaceHit = { id: string; name: string; address: string; rating: number | null; count: number | null };

const ROWS: { key: keyof Status; label: string; hint: string }[] = [
  { key: "sheets", label: "Google Sheets (báo cáo)", hint: "GOOGLE_SHEET_ID + tài khoản dịch vụ" },
  { key: "cron", label: "Tự xuất báo cáo 23:30 mỗi ngày", hint: "CRON_SECRET" },
  { key: "telegram", label: "Telegram nhóm nhà hàng", hint: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID" },
  { key: "telegramLumia", label: "Telegram nhóm lễ tân Lumia", hint: "TELEGRAM_LUMIA_CHAT_ID" },
  { key: "qrSecret", label: "Khoá ký mã QR phòng Lumia", hint: "LUMIA_QR_SECRET" },
  { key: "googlePlace", label: "Điểm đánh giá Google Maps trên web", hint: "GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID" },
];

/** Quản trị → Dữ liệu: integration status, "export report now", Telegram and Google tests. */
export default function IntegrationsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("Louis Wine Đà Nẵng");
  const [hits, setHits] = useState<PlaceHit[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/integrations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function post(url: string, body?: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Thao tác thất bại.");
    return data;
  }

  async function run(kind: "export" | "telegram" | "google" | "google-search") {
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "export") {
        const d = await post("/api/admin/export-sheets");
        setMsg({ ok: true, text: `Đã xuất báo cáo: ${d.orders} đơn, ${d.reservations} lượt đặt bàn, ${d.reviews} đánh giá → tab BaoCao_DonHang / BaoCao_DatBan / BaoCao_DanhGia.` });
      } else if (kind === "telegram") {
        const d = await post("/api/admin/integrations");
        setMsg({ ok: true, text: `Đã gửi tin thử tới nhóm nhà hàng${d.lumia ? " và nhóm lễ tân Lumia" : ""}. Kiểm tra Telegram.` });
      } else if (kind === "google") {
        const d = await post("/api/admin/integrations", { action: "google" });
        setMsg({ ok: true, text: `Kết nối Google thành công: ${d.rating} ★ · ${d.count} đánh giá · lấy được ${d.reviews} đánh giá gần đây để hiện trên web.` });
      } else {
        const d = await post("/api/admin/integrations", { action: "google-search", query });
        setHits(d.places);
        if (!d.places.length) setMsg({ ok: false, text: "Không tìm thấy địa điểm nào. Thử tên khác, ví dụ: Louis Wine 93 Nguyễn Đình Thi." });
      }
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
        <button className="btn btn-secondary" disabled={busy !== null || !status?.googlePlace} onClick={() => run("google")}>
          {busy === "google" ? "Đang kiểm tra..." : "Kiểm tra điểm Google"}
        </button>
      </div>

      {status?.googleKey && (
        <div style={{ borderTop: "1px solid var(--color-border, #ddd)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Tìm Place ID của nhà hàng</strong>
          <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
            Tìm đúng địa điểm Louis Wine Đà Nẵng, bấm Sao chép, rồi dán vào biến GOOGLE_PLACE_ID trên Vercel và Redeploy.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-secondary" disabled={busy !== null} onClick={() => run("google-search")}>
              {busy === "google-search" ? "Đang tìm..." : "Tìm"}
            </button>
          </div>
          {hits && hits.length > 0 && (
            <table className="table">
              <tbody>
                {hits.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{h.name}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {h.address}
                        {h.rating !== null ? ` · ${h.rating} ★ (${h.count ?? 0})` : ""}
                      </div>
                      <code style={{ fontSize: 12 }}>{h.id}</code>
                    </td>
                    <td style={{ width: 90 }}>
                      <button className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(h.id)}>
                        Sao chép
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
