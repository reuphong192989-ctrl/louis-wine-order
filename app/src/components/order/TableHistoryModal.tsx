"use client";

import { useEffect, useState } from "react";
import { formatVnd, formatQty } from "@/lib/format";
import { fmt } from "@/lib/site/i18n";
import type { OrderDict } from "@/lib/order-i18n";

type Round = {
  id: string;
  createdAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  items: { name: string; qty: number; lineTotal: number; kitchenStatus: "PENDING" | "COOKING" | "DONE" }[];
  total: number;
};

/** "Món đã gọi": everything this table ordered since its last bill, with live kitchen state. */
export default function TableHistoryModal({ tableId, tableLabel, onClose, t }: { tableId: string; tableLabel: string; onClose: () => void; t: OrderDict["history"] }) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch(`/api/orders/table-history?tableId=${encodeURIComponent(tableId)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          if (!live) return;
          setRounds(d.rounds);
          setTotal(d.total);
          setFailed(false);
        })
        .catch(() => live && setFailed(true));
    load();
    const id = setInterval(load, 10_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [tableId]);

  const statusOf = (r: Round, k: Round["items"][number]["kitchenStatus"]) =>
    r.status === "CONFIRMED" ? (k === "DONE" ? t.status.DONE : k === "COOKING" ? t.status.COOKING : t.status.CONFIRMED) : t.status[r.status];

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm-dialog history-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, color: "var(--color-accent)" }}>{fmt(t.title, { n: tableLabel })}</div>
        <div className="history-list">
          {rounds === null && !failed && <p className="text-muted">…</p>}
          {rounds?.length === 0 && <p className="text-muted">{t.empty}</p>}
          {rounds?.map((r) => (
            <div key={r.id} className={`history-round ${r.status === "CANCELLED" ? "is-cancelled" : ""}`}>
              <div className="history-round-head">
                {fmt(t.round, { t: new Date(r.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) })}
              </div>
              {r.items.map((it, i) => (
                <div key={i} className="history-line">
                  <span>
                    {formatQty(it.qty)} × {it.name}
                  </span>
                  <span className="history-status">{statusOf(r, it.kitchenStatus)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {rounds && rounds.length > 0 && (
          <div className="history-total">
            <span>{t.total}</span>
            <span>{formatVnd(total)}</span>
          </div>
        )}
        <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>
          {t.note}
        </p>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}
