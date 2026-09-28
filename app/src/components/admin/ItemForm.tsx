"use client";

import { useState } from "react";
import type { AdminMenuItemDTO } from "@/types";
import { builtInDishText } from "@/lib/site/menu-i18n";

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
  isFeaturedSpecial: boolean;
  nameEn: string;
  noteEn: string;
  nameRu: string;
  noteRu: string;
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
      isFeaturedSpecial: false,
      nameEn: "",
      noteEn: "",
      nameRu: "",
      noteRu: "",
    };
  }
  // Pre-fill with the saved translation, or the built-in one so it can be reviewed and saved.
  const builtIn = builtInDishText(item.name, item.note);
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
    isFeaturedSpecial: item.isFeaturedSpecial,
    nameEn: item.nameEn || builtIn.nameEn || "",
    noteEn: item.noteEn || builtIn.noteEn || "",
    nameRu: item.nameRu || builtIn.nameRu || "",
    noteRu: item.noteRu || builtIn.noteRu || "",
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải ảnh lên được.");
      set("imageUrl", data.url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

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
      isFeaturedSpecial: values.isFeaturedSpecial,
      nameEn: values.nameEn.trim() || null,
      noteEn: values.noteEn.trim() || null,
      nameRu: values.nameRu.trim() || null,
      noteRu: values.noteRu.trim() || null,
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

      <fieldset style={{ border: "1px solid var(--color-divider)", padding: "var(--space-3)", margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <legend style={{ fontWeight: 700, padding: "0 6px" }}>Bản dịch cho khách nước ngoài (website + menu bàn)</legend>
        <span className="text-muted" style={{ fontSize: 11 }}>
          Hiện khi khách chọn EN / RU. Để trống = hiện tên tiếng Việt. Nhân viên và bếp vẫn luôn thấy tên tiếng Việt.
        </span>
        <div className="field">
          <label>Tên tiếng Anh (EN)</label>
          <input className="input" value={values.nameEn} onChange={(e) => set("nameEn", e.target.value)} placeholder="VD: Grilled Japanese Fuji beef" />
        </div>
        <div className="field">
          <label>Mô tả / cách chế biến tiếng Anh (EN, tuỳ chọn)</label>
          <input className="input" value={values.noteEn} onChange={(e) => set("noteEn", e.target.value)} placeholder="VD: green pepper sauce / mushroom sauce" />
        </div>
        <div className="field">
          <label>Tên tiếng Nga (RU)</label>
          <input className="input" value={values.nameRu} onChange={(e) => set("nameRu", e.target.value)} placeholder="VD: Японская говядина Фудзи на гриле" />
        </div>
        <div className="field">
          <label>Mô tả / cách chế biến tiếng Nga (RU, tuỳ chọn)</label>
          <input className="input" value={values.noteRu} onChange={(e) => set("noteRu", e.target.value)} placeholder="VD: соус из зелёного перца / грибной соус" />
        </div>
        {values.name.trim() && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              href={`https://translate.google.com/?sl=vi&tl=en&text=${encodeURIComponent([values.name, values.note].filter(Boolean).join("\n"))}`}
              target="_blank"
              rel="noreferrer"
            >
              Gợi ý dịch EN (Google)
            </a>
            <a
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              href={`https://translate.google.com/?sl=vi&tl=ru&text=${encodeURIComponent([values.name, values.note].filter(Boolean).join("\n"))}`}
              target="_blank"
              rel="noreferrer"
            >
              Gợi ý dịch RU (Google)
            </a>
          </div>
        )}
      </fieldset>

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

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
          <span className="text-muted" style={{ fontSize: 11 }}>— hoặc —</span>
        </div>

        <label className="btn btn-secondary" style={{ display: "inline-block", width: "fit-content", cursor: "pointer" }}>
          {uploading ? "Đang tải ảnh lên..." : "Tải ảnh từ máy lên"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        {uploadError && <div style={{ color: "var(--color-accent)", fontSize: 12 }}>{uploadError}</div>}

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
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={values.isFeaturedSpecial}
          onChange={(e) => set("isFeaturedSpecial", e.target.checked)}
        />
        Hiển thị trong "Món Đặc Trưng" (ngoài danh mục gốc ở trên)
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
