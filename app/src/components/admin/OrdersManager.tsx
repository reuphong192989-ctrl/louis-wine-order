"use client";

import { useEffect, useMemo, useState } from "react";
import { formatVnd } from "@/lib/format";
import { useTableNames, tableLabel } from "@/lib/use-table-names";
import type { OrderDTO } from "@/types";

const STATUS_LABEL: Record<OrderDTO["status"], string> = {
  PENDING: "Đang chờ",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã huỷ",
};

function toDateInputValue(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN");
}

export default function OrdersManager() {
  const tableNames = useTableNames();
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkFrom, setBulkFrom] = useState(() => toDateInputValue(new Date()));
  const [bulkTo, setBulkTo] = useState(() => toDateInputValue(new Date()));
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/orders");
    if (res.ok) setOrders((await res.json()).orders);
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(
    () => (orders ?? []).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [orders]
  );

  const bulkMatchCount = useMemo(() => {
    if (!orders || !bulkFrom || !bulkTo) return 0;
    const from = new Date(bulkFrom + "T00:00:00").toISOString();
    const to = new Date(bulkTo + "T23:59:59.999").toISOString();
    return orders.filter((o) => o.createdAt >= from && o.createdAt <= to).length;
  }, [orders, bulkFrom, bulkTo]);

  async function removeOrder(order: OrderDTO) {
    if (!confirm(`Xoá vĩnh viễn đơn hàng bàn ${tableLabel(tableNames, order.tableId)} (${formatDateTime(order.createdAt)}, ${formatVnd(order.totalAmount)})?\n\nKhông thể hoàn tác — đơn sẽ bị loại khỏi báo cáo doanh thu.`)) return;
    setBusyIds((s) => new Set(s).add(order.id));
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không xoá được đơn hàng.");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(order.id);
        return next;
      });
    }
  }

  async function bulkDelete() {
    if (bulkMatchCount === 0) {
      setError("Không có đơn hàng nào trong khoảng thời gian đã chọn.");
      return;
    }
    if (
      !confirm(
        `Xoá vĩnh viễn ${bulkMatchCount} đơn hàng từ ${bulkFrom} đến ${bulkTo}?\n\nKhông thể hoàn tác — các đơn này sẽ bị loại khỏi báo cáo doanh thu.`
      )
    )
      return;

    setBulkBusy(true);
    setError(null);
    try {
      const from = new Date(bulkFrom + "T00:00:00").toISOString();
      const to = new Date(bulkTo + "T23:59:59.999").toISOString();
      const res = await fetch("/api/orders/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không xoá được các đơn hàng.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  if (!orders) return <p className="text-muted">Đang tải...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h3 style={{ margin: 0 }}>Đơn hàng ({orders.length})</h3>
      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
        Chỉ tài khoản Chủ sở hữu mới thấy trang này. Xoá đơn hàng là thao tác{" "}
        <strong style={{ color: "var(--color-accent)" }}>vĩnh viễn, không thể hoàn tác</strong> và sẽ làm giảm số liệu
        trong báo cáo Doanh thu tương ứng.
      </p>

      {error && <div style={{ color: "var(--color-accent)", fontSize: 13 }}>{error}</div>}

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexWrap: "wrap",
          background: "var(--color-neutral-100)",
          border: "1px solid var(--color-divider)",
          padding: "var(--space-3)",
        }}
      >
        <div className="field">
          <label>Xoá hàng loạt — từ ngày</label>
          <input className="input" type="date" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>Đến ngày</label>
          <input className="input" type="date" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} />
        </div>
        <span className="text-muted" style={{ fontSize: 13 }}>
          Khớp {bulkMatchCount} đơn
        </span>
        <button className="btn btn-danger" disabled={bulkBusy || bulkMatchCount === 0} onClick={bulkDelete}>
          {bulkBusy ? "Đang xoá..." : `Xoá ${bulkMatchCount} đơn trong khoảng này`}
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Bàn</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th>Món</th>
            <th>Tổng tiền</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => (
            <tr key={o.id}>
              <td style={{ fontWeight: 700 }}>{tableLabel(tableNames, o.tableId)}</td>
              <td className="text-muted">{formatDateTime(o.createdAt)}</td>
              <td>{STATUS_LABEL[o.status]}</td>
              <td style={{ fontSize: 12 }}>{o.items.map((it) => `${it.nameSnapshot} x${it.qty}`).join(", ")}</td>
              <td style={{ fontWeight: 700 }}>{formatVnd(o.totalAmount)}</td>
              <td>
                <button className="btn btn-danger" disabled={busyIds.has(o.id)} onClick={() => removeOrder(o)}>
                  Xoá
                </button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
                Chưa có đơn hàng nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
