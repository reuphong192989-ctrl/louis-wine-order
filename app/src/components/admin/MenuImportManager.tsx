"use client";

import { useCallback, useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import type { Plan } from "@/lib/menu-import-plan";

type Run = { runId: string; at: string; by: string; updated: number; created: number; undone: boolean };
const GROUP_LABEL = { FOOD: "Đồ ăn", DRINK: "Đồ uống", OTHER: "Khác" } as const;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { hour12: false });
}
const vat = (v: number | null) => (v === null ? "theo danh mục" : `${v}%`);
const grp = (g: keyof typeof GROUP_LABEL | null) => (g === null ? "theo danh mục" : GROUP_LABEL[g]);
const unit = (u: string | null) => u ?? "phần";

export default function MenuImportManager() {
  const [data, setData] = useState<{ plan: Plan; last: Run | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/menu-import", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error ?? "Không tải được bản xem trước.");
      return;
    }
    setData(body);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "apply" | "undo") {
    const ask =
      action === "apply"
        ? `Áp dụng ${data?.plan.updates.length ?? 0} cập nhật và thêm ${data?.plan.creates.length ?? 0} món mới?\n\nGiá hiện tại KHÔNG bị đổi, không món nào bị xoá. Có thể hoàn tác sau đó.`
        : "Hoàn tác lần nhập gần nhất? Món thêm mới sẽ bị xoá, VAT/nhóm/đơn vị trở về như trước.";
    if (!confirm(ask)) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/menu-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, confirm: true }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Không thực hiện được.");
      setMessage(
        action === "apply"
          ? `Đã áp dụng: ${body.updated} món cập nhật, ${body.created} món mới.`
          : `Đã hoàn tác: ${body.restored} món khôi phục, ${body.removed} món thêm mới đã xoá.`,
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <p style={{ color: "var(--color-accent)" }}>{error}</p> : <p className="text-muted">Đang tải...</p>;
  const { plan, last } = data;
  const nothing = plan.updates.length === 0 && plan.creates.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 980 }}>
      <h3>Nhập bảng menu (Book1): VAT, nhóm và đơn vị từng món</h3>
      <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
        Đối chiếu {plan.bookCount} món trong Book1 với thực đơn. Chỉ cập nhật <b>VAT riêng, nhóm hoá đơn, đơn vị tính</b> khi khác với danh mục, và thêm món còn thiếu. <b>Không đổi giá, không xoá món.</b>{" "}
        Bấm &quot;Hoàn tác&quot; nếu muốn quay lại.
      </p>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
      {message && <div style={{ color: "var(--color-accent-2-600)", fontWeight: 700 }}>{message}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          ["Cập nhật", plan.updates.length],
          ["Món mới", plan.creates.length],
          ["Đã đúng sẵn", plan.alreadyUpToDate],
          ["Không có trong Book1 (giữ nguyên)", plan.notInBook],
          ["Lệch giá (chỉ báo)", plan.priceDiffs.length],
        ].map(([label, n]) => (
          <div key={label as string} style={{ border: "1px solid var(--color-divider)", padding: "8px 14px", minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{n}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-primary" disabled={busy || nothing} onClick={() => act("apply")}>
          {busy ? "Đang xử lý..." : nothing ? "Không có gì để áp dụng" : "Áp dụng"}
        </button>
        <button className="btn btn-secondary" disabled={busy || !last || last.undone} onClick={() => act("undo")}>
          Hoàn tác lần nhập gần nhất
        </button>
        {last && (
          <span className="text-muted" style={{ fontSize: 12 }}>
            Lần gần nhất: {fmtTime(last.at)} · {last.by} · {last.updated} cập nhật, {last.created} món mới{last.undone ? " · đã hoàn tác" : ""}
          </span>
        )}
      </div>

      {plan.noCategory.length > 0 && (
        <div style={{ border: "1px solid var(--color-accent)", padding: 10, fontSize: 13 }}>
          <b>Chưa có danh mục phù hợp để thêm {plan.noCategory.length} món:</b> {plan.noCategory.map((r) => r.name).join(", ")}. Hãy tạo danh mục (đặt đúng &quot;Nhóm&quot;) rồi tải lại trang.
        </div>
      )}

      {plan.priceDiffs.length > 0 && (
        <details open>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Lệch giá giữa Book1 và thực đơn ({plan.priceDiffs.length}) — không tự đổi</summary>
          <table className="table">
            <thead><tr><th>Món</th><th>Thực đơn</th><th>Book1</th></tr></thead>
            <tbody>
              {plan.priceDiffs.map((p) => (
                <tr key={p.name}><td>{p.name}</td><td>{formatVnd(p.current)}</td><td>{formatVnd(p.book)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {plan.creates.length > 0 && (
        <details open>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Món sẽ được thêm ({plan.creates.length})</summary>
          <table className="table">
            <thead><tr><th>Món</th><th>Vào danh mục</th><th>Giá</th><th>VAT</th><th>Nhóm</th><th>Đơn vị</th></tr></thead>
            <tbody>
              {plan.creates.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td><td>{c.categoryName}</td><td>{c.priceText}</td><td>{vat(c.after.vatRate)}</td><td>{grp(c.after.group)}</td><td>{unit(c.after.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Món sẽ được cập nhật ({plan.updates.length})</summary>
        <table className="table">
          <thead><tr><th>Món</th><th>Danh mục</th><th>VAT</th><th>Nhóm</th><th>Đơn vị</th></tr></thead>
          <tbody>
            {plan.updates.map((u) => (
              <tr key={u.itemId}>
                <td>{u.name}</td>
                <td className="text-muted">{u.category}</td>
                <td>{u.before.vatRate !== u.after.vatRate ? <b>{vat(u.before.vatRate)} → {vat(u.after.vatRate)}</b> : <span className="text-muted">{vat(u.after.vatRate)}</span>}</td>
                <td>{u.before.group !== u.after.group ? <b>{grp(u.before.group)} → {grp(u.after.group)}</b> : <span className="text-muted">{grp(u.after.group)}</span>}</td>
                <td>{u.before.unit !== u.after.unit ? <b>{unit(u.before.unit)} → {unit(u.after.unit)}</b> : <span className="text-muted">{unit(u.after.unit)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
