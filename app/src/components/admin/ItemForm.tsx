"use client";

import { useState } from "react";
import type { AdminMenuItemDTO } from "@/types";

type CategoryOption = { id: string; name: string };

export type ItemFormValues = {
  categoryId: string;
  name: string;
  note: string;
  priceMode: "fixed" | "text";
  priceValue: string; // kept as string for the input, parsed on submit
  priceLabel: string;
  imageUrl: string;
  available: boolean;
  isHighlight: boolean;
};

function initialValues(item: AdminMenuItemDTO | null, defaultCategoryId: string): ItemFormValues {
  if (!item) {
    return {
      categoryId: defaultCategoryId,
      name: "",
      note: "",
      priceMode: "fixed",
      priceValue: "",
      priceLabel: "Thời giá",
      imageUrl: "",
      available: true,
      isHighlight: false,
    };
  }
  return {
    categoryId: item.categoryId,
    name: item.name,
    note: item.note ?? "",
    priceMode: item.priceValue != null ? "fixed" : "text",
    priceValue: item.priceValue != null ? String(item.priceValue) : "",
    priceLabel: item.priceValue == null ? item.priceText : "Thời giá",
    imageUrl: item.imageUrl ?? "",
    available: item.available,
    isHighlight: item.isHighlight,
  };
}

export default function ItemForm({
  item,
  categories,
  defaultCategoryId,
  onCancel,
  onSaved,
}: {
  item: AdminMenuItemDTO | null;
  categories: CategoryOption[];
  defaultCategoryId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<ItemFormValues>(() => initialValues(item, defaultCategoryId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (values.priceMode === "fixed" && !values.priceValue) {
      setError("Vui lòng nhập giá.");
      return;
    }

    const payload = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      note: values.note.trim() || null,
      priceMode: values.priceMode,
      priceValue: values.priceMode === "fixed" ? Number(values.priceValue) : undefined,
      priceLabel: values.priceMode === "text" ? values.priceLabel.trim() || "Thời giá" : undefined,
      imageUrl: values.imageUrl || null,
      available: values.available,
      isHighlight: values.isHighlight,
    };

    setSaving(true);
    try {
      const url = item ? `/api/menu-items/${item.id}` : "/api/menu-items";
      const res = await fetch(url, {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu được món ăn.");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        background: "var(--color-neutral-100)",
        border: "1px solid var(--color-divider)",
        padding: "var(--space-4)",
        maxWidth: 480,
      }}
    >
      <h3 style={{ margin: 0 }}>{item ? `Sửa: ${item.name}` : "Thêm món mới"}</h3>

      <div className="field">
        <label>Danh mục</label>
        <select className="input" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Tên món</label>
        <input className="input" value={values.name} onChange={(e) => set("name", e.target.value)} required />
      </div>

      <div className="field">
        <label>Ghi chú / cách chế biến (tuỳ chọn)</label>
        <input className="input" value={values.note} onChange={(e) => set("note", e.target.value)} />
      </div>

      <div className="field">
        <label>Giá</label>
        <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
          <label className="checkbox-row">
            <input type="radio" checked={values.priceMode === "fixed"} onChange={() => set("priceMode", "fixed")} />
            Giá cố định
          </label>
          <label className="checkbox-row">
            <input type="radio" checked={values.priceMode === "text"} onChange={() => set("priceMode", "text")} />
            Thời giá / Đang cập nhật
          </label>
        </div>
        {values.priceMode === "fixed" ? (
          <input
            className="input"
            type="number"
            min={0}
            placeholder="VD: 268000"
            value={values.priceValue}
            onChange={(e) => set("priceValue", e.target.value)}
          />
        ) : (
          <input
            className="input"
            placeholder="Thời giá"
            value={values.priceLabel}
            onChange={(e) => set("priceLabel", e.target.value)}
          />
        )}
      </div>

      <div className="field">
        <label>Link ảnh món (dán URL ảnh đã có sẵn trên mạng)</label>
        {values.imageUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <img src={values.imageUrl} alt="" style={{ width: 80, height: 60, objectFit: "cover" }} />
            <button type="button" className="btn btn-secondary" onClick={() => set("imageUrl", "")}>
              Xoá ảnh
            </button>
          </div>
        )}
        <input
          className="input"
          placeholder="https://..."
          value={values.imageUrl}
          onChange={(e) => set("imageUrl", e.target.value)}
        />
        <span className="text-muted" style={{ fontSize: 11 }}>
          Tải ảnh lên Google Drive/Photos (chọn "Bất kỳ ai có link"), Imgur, hoặc nơi lưu ảnh khác rồi dán link vào đây.
        </span>
        <span style={{ fontSize: 11, color: "var(--color-accent)" }}>
          Khuyến nghị: tránh dán trực tiếp link ảnh từ website khác (vd báo, blog) — link đó có thể bị gỡ hoặc đổi bất kỳ lúc
          nào khiến ảnh món biến mất, và có thể vướng bản quyền ảnh của bên thứ ba.
        </span>
      </div>

      <label className="checkbox-row">
        <input type="checkbox" checked={values.available} onChange={(e) => set("available", e.target.checked)} />
        Đang bán (bỏ chọn để ẩn khỏi menu khách ngay lập tức — hết hàng)
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={values.isHighlight} onChange={(e) => set("isHighlight", e.target.checked)} />
        Hiển thị trong "Món Nổi Bật"
      </label>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
