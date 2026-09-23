"use client";

import { useEffect, useState } from "react";

type TableNameEntry = { tableId: string; displayName: string };

export default function TableNamesManager() {
  const [entries, setEntries] = useState<TableNameEntry[] | null>(null);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [tableId, setTableId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadEntries() {
    const res = await fetch("/api/table-names");
    const data = await res.json();
    if (res.ok) setEntries(data.tableNames);
  }

  async function loadKnownIds() {
    const res = await fetch("/api/table-names/known-ids");
    const data = await res.json();
    if (res.ok) setKnownIds(data.tableIds);
  }

  useEffect(() => {
    loadEntries();
    loadKnownIds();
  }, []);

  function startEdit(e: TableNameEntry) {
    setEditingId(e.tableId);
    setTableId(e.tableId);
    setDisplayName(e.displayName);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setTableId("");
    setDisplayName("");
    setError(null);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    const id = tableId.trim();
    const name = displayName.trim();
    if (!id || !name) {
      setError("Vui lòng nhập mã bàn và tên hiển thị.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/table-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: id, displayName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu được tên bàn.");
      cancelEdit();
      await Promise.all([loadEntries(), loadKnownIds()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Xoá tên riêng của bàn "${id}"? Bàn sẽ hiển thị lại bằng mã gốc.`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/table-names/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (editingId === id) cancelEdit();
      await loadEntries();
    } finally {
      setDeletingId(null);
    }
  }

  const namedIds = new Set((entries ?? []).map((e) => e.tableId));
  const unnamedKnownIds = knownIds.filter((id) => !namedIds.has(id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <section>
        <h3>{editingId ? `Sửa tên bàn "${editingId}"` : "Đặt tên hiển thị cho bàn"}</h3>
        <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
          Mã bàn gốc (dùng cho QR, đổi bàn, nhật ký...) giữ nguyên không đổi. Tên hiển thị chỉ là nhãn đẹp hơn hiển thị cho khách và nhân
          viên, ví dụ mã <strong>1</strong> hiển thị thành <strong>Platinum 1</strong>.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 180 }}>
            <label>Mã bàn gốc</label>
            <input
              className="input"
              list="known-table-ids"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="VD: 01 hoặc 2-05"
              disabled={!!editingId}
              required
            />
            <datalist id="known-table-ids">
              {unnamedKnownIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </div>
          <div className="field" style={{ minWidth: 220, flex: 1 }}>
            <label>Tên hiển thị</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="VD: Platinum 1"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm tên bàn"}
          </button>
          {editingId && (
            <button className="btn btn-secondary" type="button" onClick={cancelEdit}>
              Huỷ
            </button>
          )}
        </form>
        {error && <div style={{ color: "var(--color-accent)", fontSize: 13, marginTop: 6 }}>{error}</div>}
      </section>

      <hr className="hr" />

      <section>
        <h3>Các bàn đã đặt tên riêng {entries && <span className="tag tag-outline">{entries.length}</span>}</h3>
        {entries === null && <p className="text-muted">Đang tải...</p>}
        {entries && entries.length === 0 && <p className="text-muted">Chưa có bàn nào được đặt tên riêng.</p>}
        {entries && entries.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Mã bàn gốc</th>
                <th>Tên hiển thị</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.tableId}>
                  <td>{e.tableId}</td>
                  <td>{e.displayName}</td>
                  <td style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn btn-secondary" onClick={() => startEdit(e)}>
                      Sửa
                    </button>
                    <button className="btn btn-danger" disabled={deletingId === e.tableId} onClick={() => handleDelete(e.tableId)}>
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {unnamedKnownIds.length > 0 && (
        <section>
          <h3>Mã bàn chưa đặt tên</h3>
          <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
            Các mã bàn từng xuất hiện trong đơn hàng / gọi nhân viên / lịch sử đổi bàn nhưng chưa có tên hiển thị riêng.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {unnamedKnownIds.map((id) => (
              <button
                key={id}
                type="button"
                className="tag tag-outline"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setEditingId(null);
                  setTableId(id);
                  setDisplayName("");
                  setError(null);
                }}
              >
                {id}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
