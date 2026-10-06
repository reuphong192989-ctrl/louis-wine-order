"use client";

import { useEffect, useState } from "react";

type Google = { rating: number | null; count: number | null; reviewUrl: string | null };
type BankAccount = { bank: string; number: string; holder: string } | null;
type BankAccounts = { noInvoice: BankAccount; invoice: BankAccount };
type Status = {
  sheets: boolean;
  cron: boolean;
  telegram: boolean;
  telegramLumia: boolean;
  qrSecret: boolean;
  google: Google;
  bankAccounts: BankAccounts;
};
type Flag = Exclude<keyof Status, "google" | "bankAccounts">;
type BankForm = { bank: string; number: string; holder: string };
const EMPTY_BANK: BankForm = { bank: "", number: "", holder: "" };

const ROWS: { key: Flag; label: string; hint: string }[] = [
  { key: "sheets", label: "Google Sheets (báo cáo)", hint: "GOOGLE_SHEET_ID + tài khoản dịch vụ" },
  { key: "cron", label: "Tự xuất báo cáo 23:30 mỗi ngày", hint: "CRON_SECRET" },
  { key: "telegram", label: "Telegram nhóm nhà hàng", hint: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID" },
  { key: "telegramLumia", label: "Telegram nhóm lễ tân Lumia", hint: "TELEGRAM_LUMIA_CHAT_ID" },
  { key: "qrSecret", label: "Khoá ký mã QR phòng Lumia", hint: "LUMIA_QR_SECRET" },
];

/** Quản trị → Dữ liệu: integration status, "export report now", Telegram test, Google rating shown on the site. */
export default function IntegrationsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState("");
  const [count, setCount] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [noInvoiceAcct, setNoInvoiceAcct] = useState<BankForm>(EMPTY_BANK);
  const [invoiceAcct, setInvoiceAcct] = useState<BankForm>(EMPTY_BANK);

  useEffect(() => {
    fetch("/api/admin/integrations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Status | null) => {
        setStatus(s);
        if (s?.google) {
          setRating(s.google.rating ? String(s.google.rating) : "");
          setCount(s.google.count ? String(s.google.count) : "");
          setReviewUrl(s.google.reviewUrl ?? "");
        }
        if (s?.bankAccounts) {
          setNoInvoiceAcct(s.bankAccounts.noInvoice ?? EMPTY_BANK);
          setInvoiceAcct(s.bankAccounts.invoice ?? EMPTY_BANK);
        }
      })
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

  async function run(kind: "export" | "telegram" | "google" | "bank") {
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "export") {
        const d = await post("/api/admin/export-sheets");
        setMsg({ ok: true, text: `Đã xuất báo cáo: ${d.orders} đơn, ${d.reservations} lượt đặt bàn, ${d.reviews} đánh giá → tab BaoCao_DonHang / BaoCao_DatBan / BaoCao_DanhGia.` });
      } else if (kind === "telegram") {
        const d = await post("/api/admin/integrations");
        setMsg({ ok: true, text: `Đã gửi tin thử tới nhóm nhà hàng${d.lumia ? " và nhóm lễ tân Lumia" : ""}. Kiểm tra Telegram.` });
      } else if (kind === "bank") {
        await post("/api/admin/integrations", { action: "bank-accounts", noInvoice: noInvoiceAcct, invoice: invoiceAcct });
        setMsg({ ok: true, text: "Đã lưu 2 tài khoản nhận thanh toán cho màn hình thu ngân." });
      } else {
        const r = rating.trim().replace(",", ".");
        const c = count.trim().replace(/[.,\s]/g, "");
        const rNum = r ? Number(r) : null;
        const cNum = c ? Number(c) : null;
        if (rNum !== null && !(rNum >= 1 && rNum <= 5)) throw new Error("Điểm phải từ 1 đến 5, ví dụ 4,7.");
        if (cNum !== null && !Number.isInteger(cNum)) throw new Error("Số lượt đánh giá phải là số nguyên.");
        const d = await post("/api/admin/integrations", { action: "google-rating", rating: rNum, count: cNum, reviewUrl: reviewUrl.trim() || null });
        setMsg({ ok: true, text: d.google.rating ? `Đã lưu. Trang web hiện ${d.google.rating} ★ trên Google.` : "Đã lưu. Trang web ẩn điểm, chỉ hiện 2 nút Google." });
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
      </div>

      <div style={{ borderTop: "1px solid var(--color-border, #ddd)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>Điểm Google Maps hiển thị trên web</strong>
        <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
          Nhập đúng số đang hiện trên Google Maps. Để trống ô Điểm nếu muốn ẩn điểm (chỉ còn 2 nút Google). Link viết đánh giá lấy trong
          Google Business Profile → &quot;Nhận thêm đánh giá&quot; (dạng https://g.page/r/…/review); để trống thì nút mở trang Google Maps
          của nhà hàng.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "120px 160px 1fr", gap: 8 }}>
          <input className="input" placeholder="Điểm, vd 4,7" value={rating} onChange={(e) => setRating(e.target.value)} inputMode="decimal" />
          <input className="input" placeholder="Số lượt (không bắt buộc)" value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" />
          <input className="input" placeholder="Link viết đánh giá (không bắt buộc)" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} />
        </div>
        <div>
          <button className="btn btn-primary" disabled={busy !== null || !status} onClick={() => run("google")}>
            {busy === "google" ? "Đang lưu..." : "Lưu điểm Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
