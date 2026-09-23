"use client";

import { useState } from "react";

export default function TableSwitchModal({
  currentTableId,
  currentTableLabel,
  cartHasItems,
  onClose,
  onSwitched,
}: {
  currentTableId: string;
  currentTableLabel?: string;
  cartHasItems: boolean;
  onClose: () => void;
  onSwitched: (newTableId: string) => void;
}) {
  const [floor, setFloor] = useState("");
  const [table, setTable] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const tableNum = table.trim();
    if (!tableNum) {
      setError("Vui lòng nhập số bàn.");
      return;
    }
    const newTableId = floor.trim() ? `${floor.trim()}-${tableNum}` : tableNum;

    if (cartHasItems && !confirm("Giỏ hàng hiện tại sẽ bị xoá khi đổi sang bàn khác. Tiếp tục?")) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/table-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          previousTableId: currentTableId,
          newTableId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không đổi được bàn.");
      onSwitched(newTableId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <form className="confirm-dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, color: "var(--color-accent)" }}>
          Gán / đổi bàn cho thiết bị này
        </div>
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
          Đang ở bàn <strong>{currentTableLabel || currentTableId}</strong>. Chỉ nhân viên mới đổi được — cần đăng nhập bằng tài khoản của
          bạn, mỗi lần đổi đều được ghi lại để đối chiếu nếu có nhầm lẫn.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Tầng (tuỳ chọn)</label>
            <input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="VD: 2" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Số bàn</label>
            <input className="input" value={table} onChange={(e) => setTable(e.target.value)} placeholder="VD: 05" required />
          </div>
        </div>

        <div className="field">
          <label>Tên đăng nhập nhân viên</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Mật khẩu</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} type="submit" disabled={saving}>
            {saving ? "Đang xác nhận..." : "Xác nhận đổi bàn"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}
