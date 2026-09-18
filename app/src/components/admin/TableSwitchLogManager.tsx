"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  previousTableId: string | null;
  newTableId: string;
  username: string;
  role: string;
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = { OWNER: "Chủ sở hữu", ADMIN: "Quản lý", STAFF: "Nhân viên" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN");
}

export default function TableSwitchLogManager() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/table-switch-log")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được nhật ký.");
        setEntries(data.entries);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>;
  if (!entries) return <p className="text-muted">Đang tải...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h3 style={{ margin: 0 }}>Nhật ký gán / đổi bàn ({entries.length})</h3>
      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
        Mỗi lần một thiết bị được gán hoặc đổi sang bàn khác (qua nút "Đổi bàn" trên trang gọi món), nhân viên phải
        đăng nhập bằng chính tài khoản của mình — dòng ghi lại ở đây dùng để đối chiếu nếu có nhầm lẫn bàn sau này.
        Đây là nhật ký chỉ-thêm (append-only), không thể xoá hay sửa.
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Nhân viên</th>
            <th>Quyền</th>
            <th>Bàn cũ</th>
            <th>Bàn mới</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="text-muted">{formatDateTime(e.createdAt)}</td>
              <td style={{ fontWeight: 700 }}>{e.username}</td>
              <td>{ROLE_LABEL[e.role] ?? e.role}</td>
              <td className="text-muted">{e.previousTableId ?? "—"}</td>
              <td style={{ fontWeight: 700, color: "var(--color-accent)" }}>{e.newTableId}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                Chưa có lần gán/đổi bàn nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
