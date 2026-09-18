"use client";

import { useEffect, useMemo, useState } from "react";

type UserRow = { id: string; username: string; role: string };
type Severity = "LOW" | "MEDIUM" | "HIGH";
type Incident = { id: string; username: string; severity: Severity; description: string; createdBy: string; createdAt: string };
type Kpi = {
  username: string;
  confirmedOrders: number;
  cancelledOrders: number;
  handledStaffCalls: number;
  avgResponseSeconds: number | null;
  tableSwitches: number;
  incidents: Incident[];
};

type Preset = "month" | "7d" | "custom";
const PRESET_LABELS: Record<Preset, string> = { month: "Tháng này", "7d": "7 ngày qua", custom: "Tuỳ chỉnh" };
const SEVERITY_LABEL: Record<Severity, string> = { LOW: "Nhẹ", MEDIUM: "Vừa", HIGH: "Nặng" };
const SEVERITY_TAG: Record<Severity, string> = { LOW: "tag-neutral", MEDIUM: "tag-accent-2", HIGH: "tag-accent" };

function toDateInputValue(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN");
}
function formatSeconds(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec} giây`;
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${min} phút ${rest} giây`;
}

export default function StaffReviewManager() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [username, setUsername] = useState<string>("");
  const [preset, setPreset] = useState<Preset>("month");
  const now = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState(toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(toDateInputValue(now));

  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [severity, setSeverity] = useState<Severity>("LOW");
  const [description, setDescription] = useState("");
  const [savingIncident, setSavingIncident] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setUsers(data.users);
          if (data.users.length > 0) setUsername((u) => u || data.users[0].username);
        }
      })
      .catch(() => {});
  }, []);

  const range = useMemo(() => {
    const today = new Date();
    if (preset === "month") {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: today };
    }
    if (preset === "7d") {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }
    return {
      from: customFrom ? new Date(customFrom + "T00:00:00") : today,
      to: customTo ? new Date(customTo + "T23:59:59.999") : today,
    };
  }, [preset, customFrom, customTo]);

  async function loadKpi() {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(range.to);
      to.setHours(23, 59, 59, 999);
      const res = await fetch(
        `/api/staff-kpi?username=${encodeURIComponent(username)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được số liệu.");
      setKpi(data.kpi);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (username) loadKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, range.from.getTime(), range.to.getTime()]);

  async function addIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Vui lòng mô tả sai sót.");
      return;
    }
    setSavingIncident(true);
    setError(null);
    try {
      const res = await fetch("/api/staff-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, severity, description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không ghi nhận được sai sót.");
      setDescription("");
      setSeverity("LOW");
      await loadKpi();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingIncident(false);
    }
  }

  async function removeIncident(id: string) {
    if (!confirm("Xoá bản ghi sai sót này?")) return;
    try {
      const res = await fetch(`/api/staff-incidents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không xoá được.");
      }
      await loadKpi();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!users) return <p className="text-muted">Đang tải...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 860 }}>
      <h3 style={{ margin: 0 }}>Đánh giá nhân viên</h3>
      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
        Số liệu tự động tính từ các đơn/cuộc gọi/lần đổi bàn mà chính tài khoản nhân viên đó xử lý — chỉ Quản lý và
        Chủ sở hữu xem được trang này, nhân viên không tự xem được đánh giá của mình trong app.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ minWidth: 200 }}>
          <label>Nhân viên</label>
          <select className="input" value={username} onChange={(e) => setUsername(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.username}>
                {u.username} ({u.role === "OWNER" ? "Chủ sở hữu" : u.role === "ADMIN" ? "Quản lý" : "Nhân viên"})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
            <button key={p} className={`btn ${preset === p ? "btn-primary" : "btn-secondary"}`} onClick={() => setPreset(p)}>
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <>
            <div className="field">
              <label>Từ ngày</label>
              <input className="input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="field">
              <label>Đến ngày</label>
              <input className="input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}
      {loading && <p className="text-muted">Đang tải...</p>}

      {kpi && !loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            {[
              ["Đơn đã xác nhận", kpi.confirmedOrders],
              ["Đơn đã huỷ", kpi.cancelledOrders],
              ["Cuộc gọi đã xử lý", kpi.handledStaffCalls],
              ["Thời gian phản hồi TB", formatSeconds(kpi.avgResponseSeconds)],
              ["Số lần gán/đổi bàn", kpi.tableSwitches],
              ["Số sai sót ghi nhận", kpi.incidents.length],
            ].map(([label, value]) => (
              <div key={label as string} style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", padding: "var(--space-3)" }}>
                <div className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {label}
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20 }}>{value}</div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: 0 }}>Sai sót đã ghi nhận trong khoảng thời gian này</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Mức độ</th>
                <th>Mô tả</th>
                <th>Người ghi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {kpi.incidents.map((i) => (
                <tr key={i.id}>
                  <td className="text-muted">{formatDateTime(i.createdAt)}</td>
                  <td>
                    <span className={`tag ${SEVERITY_TAG[i.severity]}`}>{SEVERITY_LABEL[i.severity]}</span>
                  </td>
                  <td>{i.description}</td>
                  <td className="text-muted">{i.createdBy}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => removeIncident(i.id)}>
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
              {kpi.incidents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Chưa có sai sót nào được ghi nhận trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <form
            onSubmit={addIncident}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexWrap: "wrap",
              background: "var(--color-neutral-100)",
              border: "1px solid var(--color-divider)",
              padding: "var(--space-3)",
            }}
          >
            <div className="field" style={{ minWidth: 140 }}>
              <label>Mức độ</label>
              <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                <option value="LOW">Nhẹ</option>
                <option value="MEDIUM">Vừa</option>
                <option value="HIGH">Nặng</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 240 }}>
              <label>Mô tả sai sót cho &quot;{username}&quot;</label>
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Phục vụ nhầm bàn 5 sang bàn 7"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingIncident}>
              {savingIncident ? "Đang lưu..." : "Ghi nhận sai sót"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
