"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/slugify";
import { builtInCategoryName } from "@/lib/site/menu-i18n";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  nameEn?: string | null;
  nameRu?: string | null;
  vatRate: number;
  _count: { items: number };
};

export default function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEn, setEditingEn] = useState("");
  const [editingRu, setEditingRu] = useState("");
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  async function load() {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories((await res.json()).categories);
  }

  useEffect(() => {
    load();
  }, []);

  function handleNameChange(v: string) {
    setNewName(v);
    if (!slugTouched) setNewSlug(slugify(v));
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, slug: newSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được danh mục.");
      setNewName("");
      setNewSlug("");
      setSlugTouched(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveRename(id: string) {
    if (!editingName.trim()) return;
    await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim(), nameEn: editingEn.trim() || null, nameRu: editingRu.trim() || null }),
    });
    setEditingId(null);
    await load();
  }

  async function move(index: number, dir: -1 | 1) {
    if (!categories) return;
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    await reorder(ids);
  }

  async function moveToPosition(index: number, newPos: number) {
    if (!categories) return;
    const newIndex = Math.max(0, Math.min(categories.length - 1, newPos - 1));
    if (newIndex === index || Number.isNaN(newIndex)) return;
    const ids = categories.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(newIndex, 0, moved);
    await reorder(ids);
  }

  async function reorder(orderedIds: string[]) {
    setReordering(true);
    try {
      await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      await load();
    } finally {
      setReordering(false);
    }
  }

  async function saveVatRate(id: string, vatRate: number) {
    await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vatRate }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Xoá danh mục này?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Không xoá được danh mục.");
      return;
    }
    await load();
  }

  if (!categories) return <p className="text-muted">Đang tải...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 720 }}>
      <h3>Danh mục ({categories.length})</h3>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 120 }}>Thứ tự</th>
            <th>Tên</th>
            <th>Slug</th>
            <th>Số món</th>
            <th style={{ width: 90 }}>VAT %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, i) => (
            <tr key={cat.id}>
              <td>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    key={`${cat.id}-${i}`}
                    className="input"
                    type="number"
                    min={1}
                    max={categories.length}
                    defaultValue={i + 1}
                    disabled={reordering}
                    style={{ width: 48, padding: "4px 6px", textAlign: "center" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val && val !== i + 1) moveToPosition(i, val);
                      else e.target.value = String(i + 1);
                    }}
                  />
                  <button className="btn btn-ghost" style={{ padding: "2px 6px" }} disabled={i === 0 || reordering} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "2px 6px" }} disabled={i === categories.length - 1 || reordering} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                </div>
              </td>
              <td>
                {editingId === cat.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 360 }}>
                    <input className="input" value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus placeholder="Tên tiếng Việt" />
                    <input className="input" value={editingEn} onChange={(e) => setEditingEn(e.target.value)} placeholder="Tên tiếng Anh (EN) — vd: Seafood" />
                    <input className="input" value={editingRu} onChange={(e) => setEditingRu(e.target.value)} placeholder="Tên tiếng Nga (RU) — vd: Морепродукты" />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-primary" onClick={() => saveRename(cat.id)}>Lưu</button>
                      <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Huỷ</button>
                    </div>
                  </div>
                ) : (
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      const builtIn = builtInCategoryName(cat.name);
                      setEditingId(cat.id);
                      setEditingName(cat.name);
                      setEditingEn(cat.nameEn || builtIn.nameEn || "");
                      setEditingRu(cat.nameRu || builtIn.nameRu || "");
                    }}
                    title="Bấm để sửa tên (VI / EN / RU)"
                  >
                    {cat.name}
                    <span className="text-muted" style={{ display: "block", fontSize: 11 }}>
                      EN: {cat.nameEn || builtInCategoryName(cat.name).nameEn || "—"} · RU: {cat.nameRu || builtInCategoryName(cat.name).nameRu || "—"}
                    </span>
                  </span>
                )}
              </td>
              <td className="text-muted">{cat.slug}</td>
              <td>{cat._count.items}</td>
              <td>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={cat.vatRate}
                  style={{ width: 60, padding: "4px 6px", textAlign: "center" }}
                  title="Thuế suất VAT áp cho các món trong danh mục này khi in hoá đơn ở màn hình thu ngân"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isInteger(val) && val !== cat.vatRate) saveVatRate(cat.id, val);
                    else e.target.value = String(cat.vatRate);
                  }}
                />
              </td>
              <td>
                <button className="btn btn-danger" disabled={cat._count.items > 0} onClick={() => remove(cat.id)}>
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={addCategory} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Tên danh mục mới</label>
          <input className="input" value={newName} onChange={(e) => handleNameChange(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>Slug</label>
          <input
            className="input"
            value={newSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setNewSlug(e.target.value);
            }}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Thêm danh mục
        </button>
      </form>
      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
    </div>
  );
}
