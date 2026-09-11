"use client";

import { useEffect, useState } from "react";

type UserRow = { id: string; username: string; role: "ADMIN" | "STAFF" };

export default function UsersManager() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "STAFF">("STAFF");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState("");

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers((await res.json()).users);
  }

  useEffect(() => {
    load();
  }, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được tài khoản.");
      setNewUsername("");
      setNewPassword("");
      setNewRole("STAFF");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id: string, role: "ADMIN" | "STAFF") {
    setError(null);
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Không đổi được quyền.");
      return;
    }
    await load();
  }

  async function savePassword(id: string) {
    if (editingPassword.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: editingPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Không đổi được mật khẩu.");
      return;
    }
    setEditingId(null);
    setEditingPassword("");
    await load();
  }

  async function remove(user: UserRow) {
    if (!confirm(`Xoá tài khoản "${user.username}"?`)) return;
    setError(null);
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Không xoá được tài khoản.");
      return;
    }
    await load();
  }

  if (!users) return <p className="text-muted">Đang tải...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 640 }}>
      <h3>Tài khoản ({users.length})</h3>

      <table className="table">
        <thead>
          <tr>
            <th>Tên đăng nhập</th>
            <th>Quyền</th>
            <th>Đổi mật khẩu</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ fontWeight: 700 }}>{u.username}</td>
              <td>
                <select className="input" style={{ width: 140 }} value={u.role} onChange={(e) => changeRole(u.id, e.target.value as "ADMIN" | "STAFF")}>
                  <option value="ADMIN">Quản lý</option>
                  <option value="STAFF">Nhân viên</option>
                </select>
              </td>
              <td>
                {editingId === u.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="input"
                      type="password"
                      placeholder="Mật khẩu mới"
                      value={editingPassword}
                      onChange={(e) => setEditingPassword(e.target.value)}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={() => savePassword(u.id)}>
                      Lưu
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(null);
                        setEditingPassword("");
                      }}
                    >
                      Huỷ
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingId(u.id);
                      setEditingPassword("");
                    }}
                  >
                    Đổi mật khẩu
                  </button>
                )}
              </td>
              <td>
                <button className="btn btn-danger" onClick={() => remove(u)}>
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={addUser} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>Tên đăng nhập mới</label>
          <input className="input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>Mật khẩu</label>
          <input
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="field" style={{ minWidth: 140 }}>
          <label>Quyền</label>
          <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as "ADMIN" | "STAFF")}>
            <option value="STAFF">Nhân viên</option>
            <option value="ADMIN">Quản lý</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Thêm tài khoản
        </button>
      </form>
      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
    </div>
  );
}
