"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  visitType: string | null;
  isLumiaGuest: boolean;
  isVisible: boolean;
  createdAt: string;
};

/** Customer reviews from the website — hide spam or abusive ones from the public page. */
export default function ReviewsManager() {
  const [list, setList] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reviews?all=1", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được đánh giá.");
        setList(data.reviews);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function toggle(r: Review) {
    const res = await fetch(`/api/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !r.isVisible }),
    });
    if (res.ok) setList((l) => l?.map((x) => (x.id === r.id ? { ...x, isVisible: !x.isVisible } : x)) ?? l);
    else setError((await res.json().catch(() => null))?.error ?? "Cập nhật thất bại.");
  }

  if (!list) return error ? <div style={{ color: "var(--color-accent)" }}>{error}</div> : <p className="text-muted">Đang tải...</p>;

  const visible = list.filter((r) => r.isVisible);
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 960 }}>
      <h3 style={{ margin: 0 }}>
        Đánh giá của khách ({list.length}) · trung bình {visible.length ? avg.toFixed(1) : "—"}★
      </h3>
      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Khách</th>
            <th>Đánh giá</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id} style={r.isVisible ? undefined : { opacity: 0.55 }}>
              <td className="text-muted" style={{ whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
              <td>
                <b>{r.customerName}</b>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {[r.visitType, r.isLumiaGuest && "Khách Lumia"].filter(Boolean).join(" · ")}
                </div>
              </td>
              <td>
                <span style={{ color: "var(--color-accent-2-600)" }}>{"★".repeat(r.rating)}</span>
                <span className="text-muted">{"★".repeat(5 - r.rating)}</span>
                <div style={{ fontSize: 13, whiteSpace: "pre-line" }}>{r.comment}</div>
              </td>
              <td>
                <button className={`btn ${r.isVisible ? "btn-secondary" : "btn-primary"}`} onClick={() => toggle(r)}>
                  {r.isVisible ? "Ẩn" : "Hiện lại"}
                </button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted">Chưa có đánh giá nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
