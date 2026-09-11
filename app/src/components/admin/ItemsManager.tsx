"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminMenuItemDTO } from "@/types";
import ItemForm from "./ItemForm";

type CategoryOption = { id: string; name: string };

export default function ItemsManager() {
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [items, setItems] = useState<AdminMenuItemDTO[] | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [editing, setEditing] = useState<AdminMenuItemDTO | "new" | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  async function loadCategories() {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories((await res.json()).categories);
  }

  async function loadItems() {
    const res = await fetch("/api/menu-items");
    if (res.ok) setItems((await res.json()).items);
  }

  useEffect(() => {
    loadCategories();
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (filterCategoryId === "all") return items;
    return items.filter((it) => it.categoryId === filterCategoryId);
  }, [items, filterCategoryId]);

  async function toggleField(item: AdminMenuItemDTO, field: "available" | "isHighlight") {
    setBusyIds((s) => new Set(s).add(item.id));
    const payload = {
      categoryId: item.categoryId,
      name: item.name,
      note: item.note,
      priceMode: item.priceValue != null ? "fixed" : "text",
      priceValue: item.priceValue ?? undefined,
      priceLabel: item.priceValue == null ? item.priceText : undefined,
      imageUrl: item.imageUrl,
      available: field === "available" ? !item.available : item.available,
      isHighlight: field === "isHighlight" ? !item.isHighlight : item.isHighlight,
    };
    try {
      await fetch(`/api/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadItems();
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function remove(item: AdminMenuItemDTO) {
    if (!confirm(`Xoá món "${item.name}"?`)) return;
    await fetch(`/api/menu-items/${item.id}`, { method: "DELETE" });
    await loadItems();
  }

  if (!categories || !items) return <p className="text-muted">Đang tải...</p>;

  if (editing) {
    return (
      <ItemForm
        item={editing === "new" ? null : editing}
        categories={categories}
        defaultCategoryId={filterCategoryId !== "all" ? filterCategoryId : categories[0]?.id ?? ""}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await loadItems();
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Món ăn ({filteredItems.length}/{items.length})</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" style={{ width: 220 }} value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            + Thêm món
          </button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Tên món</th>
            <th>Danh mục</th>
            <th>Giá</th>
            <th>Trạng thái</th>
            <th>Nổi bật</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id} style={{ opacity: item.available ? 1 : 0.55 }}>
              <td>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" style={{ width: 44, height: 33, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 44, height: 33, background: "var(--color-neutral-300)" }} />
                )}
              </td>
              <td>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                {item.note && <div className="text-muted" style={{ fontSize: 11 }}>{item.note}</div>}
              </td>
              <td className="text-muted">{item.category.name}</td>
              <td>{item.priceText}</td>
              <td>
                <button
                  className="btn"
                  style={{ fontSize: 11, padding: "4px 8px", border: "1px solid var(--color-divider)" }}
                  disabled={busyIds.has(item.id)}
                  onClick={() => toggleField(item, "available")}
                >
                  {item.available ? "Đang bán" : "Hết hàng"}
                </button>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={item.isHighlight}
                  disabled={busyIds.has(item.id)}
                  onChange={() => toggleField(item, "isHighlight")}
                />
              </td>
              <td style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-secondary" onClick={() => setEditing(item)}>
                  Sửa
                </button>
                <button className="btn btn-danger" onClick={() => remove(item)}>
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
