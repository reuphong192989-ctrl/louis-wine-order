"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime, formatVnd } from "@/lib/format";
import { usePolling } from "@/lib/use-polling";
import { playAlertSound, stopAlertSound } from "@/lib/sound";
import { useTableNames, tableLabel } from "@/lib/use-table-names";
import PushBanner from "@/components/shared/PushBanner";
import type { OrderDTO, ReservationDTO, StaffCallDTO } from "@/types";

// Pending work nobody has taken for this long is "overdue": red card + repeat chime.
const OVERDUE_MS = 2 * 60 * 1000;
const REMIND_EVERY_MS = 60 * 1000;

type OrderAction = { action: "claim" | "unclaim" | "delivering" | "delivered" } | { action: "paid"; method: "CASH" | "TRANSFER" };

export default function StaffDashboard({ username, role }: { username: string; role: "OWNER" | "ADMIN" | "STAFF" }) {
  const router = useRouter();
  const tableNames = useTableNames();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [calls, setCalls] = useState<StaffCallDTO[]>([]);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const knownPendingIds = useRef<Set<string> | null>(null);
  const knownReadyOrderIds = useRef<Set<string> | null>(null);
  const lastReminderAt = useRef(0);
  const [connError, setConnError] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");

  // Poll every few seconds — the realtime substitute for WebSocket push on
  // serverless hosting. Chimes for genuinely new pending orders/calls/bookings,
  // and again every minute while something has waited > 2 min with nobody on it.
  usePolling(async () => {
    let responses: Response[];
    try {
      responses = await Promise.all([fetch("/api/orders"), fetch("/api/staff-calls"), fetch("/api/reservations")]);
    } catch {
      setConnError(true); // offline — keep showing the last known lists
      return;
    }
    if (responses.some((r) => r.status === 401)) {
      // Session expired (12h shift): never leave a silently empty screen.
      router.push(role === "STAFF" ? "/staff/login" : "/admin/login");
      return;
    }
    if (responses.some((r) => !r.ok)) {
      // Server hiccup: keep the last lists and don't touch the chime baseline,
      // otherwise cards would vanish and every pending item would re-chime.
      setConnError(true);
      return;
    }
    const [ordersRes, callsRes, resRes] = responses;
    const nextOrders: OrderDTO[] = (await ordersRes.json()).orders;
    const nextCalls: StaffCallDTO[] = (await callsRes.json()).calls;
    const nextRes: ReservationDTO[] = (await resRes.json()).reservations;
    setConnError(false);
    const t = Date.now();
    setNow(t);

    const nowPendingIds = new Set([
      ...nextOrders.filter((o) => o.status === "PENDING").map((o) => o.id),
      ...nextCalls.filter((c) => c.status === "PENDING").map((c) => c.id),
      ...nextRes.filter((r) => r.status === "NEW").map((r) => `res:${r.id}`),
    ]);
    let chimed = false;
    if (knownPendingIds.current) {
      const hasNew = [...nowPendingIds].some((id) => !knownPendingIds.current!.has(id));
      if (hasNew) {
        playAlertSound();
        chimed = true;
      }
    }
    knownPendingIds.current = nowPendingIds;

    // Kitchen just finished every item of a confirmed order — chime here too, not only via radio.
    const nowReadyIds = new Set(
      nextOrders
        .filter((o) => o.status === "CONFIRMED" && o.items.length > 0 && o.items.every((it) => it.kitchenStatus === "DONE"))
        .map((o) => o.id),
    );
    if (knownReadyOrderIds.current) {
      const hasNewReady = [...nowReadyIds].some((id) => !knownReadyOrderIds.current!.has(id));
      if (hasNewReady && !chimed) {
        playAlertSound();
        chimed = true;
      }
    }
    knownReadyOrderIds.current = nowReadyIds;

    const overdue =
      nextOrders.some((o) => o.status === "PENDING" && !o.claimedBy && t - Date.parse(o.createdAt) > OVERDUE_MS) ||
      nextCalls.some((c) => c.status === "PENDING" && t - Date.parse(c.createdAt) > OVERDUE_MS) ||
      nextRes.some((r) => r.status === "NEW" && !r.claimedBy && t - Date.parse(r.createdAt) > OVERDUE_MS);
    if (chimed) lastReminderAt.current = t;
    else if (overdue && t - lastReminderAt.current >= REMIND_EVERY_MS) {
      playAlertSound();
      lastReminderAt.current = t;
    }

    setOrders(nextOrders);
    setCalls(nextCalls);
    setReservations(nextRes);
  }, 4_000);

  function markBusy(id: string, busy: boolean) {
    setBusyIds((s) => {
      const next = new Set(s);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function patchReservation(id: string, body: Record<string, unknown>) {
    stopAlertSound();
    markBusy(id, true);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) setReservations((list) => list.map((r) => (r.id === id ? data.reservation : r)));
      else window.alert(data?.error ?? "Không cập nhật được lượt đặt bàn — vui lòng thử lại.");
    } catch {
      window.alert("Mất kết nối — chưa cập nhật được lượt đặt bàn, vui lòng thử lại.");
    } finally {
      markBusy(id, false);
    }
  }

  async function orderWorkflow(id: string, body: OrderAction) {
    stopAlertSound();
    markBusy(id, true);
    try {
      const res = await fetch(`/api/orders/${id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) setOrders((list) => list.map((o) => (o.id === id ? data.order : o)));
      else window.alert(data?.error ?? "Không cập nhật được đơn — vui lòng thử lại.");
    } catch {
      window.alert("Mất kết nối — chưa cập nhật được đơn, vui lòng thử lại.");
    } finally {
      markBusy(id, false);
    }
  }

  async function updateOrder(id: string, status: "CONFIRMED" | "CANCELLED", cancelReason?: string) {
    stopAlertSound();
    markBusy(id, true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status === "CANCELLED" ? { status, cancelReason } : { status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Không cập nhật được đơn — vui lòng thử lại.");
      }
    } catch {
      window.alert("Mất kết nối — chưa cập nhật được đơn, vui lòng thử lại.");
    } finally {
      markBusy(id, false);
    }
  }

  function openCancelDialog(id: string) {
    setCancelOrderId(id);
    setCancelReasonInput("");
  }

  async function confirmCancelOrder() {
    if (!cancelOrderId) return;
    const reason = cancelReasonInput.trim();
    if (!reason) return;
    await updateOrder(cancelOrderId, "CANCELLED", reason);
    setCancelOrderId(null);
    setCancelReasonInput("");
  }

  async function ackCall(id: string) {
    stopAlertSound();
    markBusy(id, true);
    try {
      await fetch(`/api/staff-calls/${id}`, { method: "PATCH" });
    } finally {
      markBusy(id, false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(role === "STAFF" ? "/staff/login" : "/admin/login");
    router.refresh();
  }

  const pendingCalls = calls.filter((c) => c.status === "PENDING");
  const doneCalls = calls.filter((c) => c.status !== "PENDING").slice(0, 15);
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(now));
  const newReservations = reservations
    .filter((r) => r.status === "NEW")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const todayReservations = reservations
    .filter((r) => r.date === today && r.status !== "NEW" && r.status !== "CANCELLED")
    .sort((a, b) => (a.time < b.time ? -1 : 1));
  // Confirmed website orders still to hand over or to collect payment for (last 24h).
  const activeOnline = orders
    .filter(
      (o) =>
        o.online &&
        o.status === "CONFIRMED" &&
        (o.fulfillment !== "DELIVERED" || !o.paidAt) &&
        now - Date.parse(o.createdAt) < 24 * 3600 * 1000,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const doneOrders = orders.filter((o) => o.status !== "PENDING").slice(0, 20);
  const overdueCount =
    pendingOrders.filter((o) => !o.claimedBy && now - Date.parse(o.createdAt) > OVERDUE_MS).length +
    pendingCalls.filter((c) => now - Date.parse(c.createdAt) > OVERDUE_MS).length +
    newReservations.filter((r) => !r.claimedBy && now - Date.parse(r.createdAt) > OVERDUE_MS).length;

  const cardStyle = (overdue: boolean, bg: string) => ({
    border: `2px solid ${overdue ? "#c0141c" : "var(--color-accent)"}`,
    boxShadow: overdue ? "0 0 0 3px rgba(192,20,28,0.25)" : undefined,
    background: bg,
    padding: "var(--space-3)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="order-header">
        <div className="order-logo">LOUIS WINE</div>
        <h3 style={{ margin: 0 }}>Màn hình nhân viên</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/kitchen" className="btn btn-secondary">
            Màn hình bếp
          </Link>
          <Link href="/le-tan" className="btn btn-secondary">
            Bảng Lumia
          </Link>
          {role !== "STAFF" && (
            <Link href="/admin/categories" className="btn btn-secondary">
              Quay lại Quản trị
            </Link>
          )}
          <span className="text-muted" style={{ fontSize: 13 }}>
            {username} ({role === "OWNER" ? "Chủ sở hữu" : role === "ADMIN" ? "Quản lý" : "Nhân viên"})
          </span>
          <button className="btn btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <PushBanner />

      <main className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {connError && (
          <div
            role="alert"
            style={{ background: "var(--color-accent)", color: "#fff", padding: "var(--space-2) var(--space-3)", fontWeight: 700 }}
          >
            ⚠ Mất kết nối tới máy chủ — đang thử lại. Danh sách bên dưới có thể chưa cập nhật; gọi Hotline nếu kéo dài.
          </div>
        )}
        {overdueCount > 0 && (
          <div role="alert" style={{ background: "#c0141c", color: "#fff", padding: "var(--space-2) var(--space-3)", fontWeight: 700 }}>
            🔔 {overdueCount} việc đã chờ quá 2 phút mà chưa ai nhận — bấm &quot;Tôi nhận xử lý&quot; hoặc xử lý ngay. Chuông sẽ nhắc lại mỗi phút.
          </div>
        )}

        <section>
          <h3>Gọi nhân viên {pendingCalls.length > 0 && <span className="tag tag-accent">{pendingCalls.length} đang chờ</span>}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
            {pendingCalls.map((c) => {
              const overdue = now - Date.parse(c.createdAt) > OVERDUE_MS;
              return (
                <div key={c.id} style={cardStyle(overdue, "var(--color-accent-100)")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>Bàn {tableLabel(tableNames, c.tableId)}</span>
                    <WaitBadge since={c.createdAt} now={now} />
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>Gọi lúc {formatTime(c.createdAt)}</div>
                  <button className="btn btn-primary" disabled={busyIds.has(c.id)} onClick={() => ackCall(c.id)}>
                    Đã xử lý
                  </button>
                </div>
              );
            })}
            {pendingCalls.length === 0 && <p className="text-muted">Không có yêu cầu nào đang chờ.</p>}
          </div>

          {doneCalls.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary className="text-muted" style={{ cursor: "pointer", fontSize: 13 }}>
                Lịch sử gần đây ({doneCalls.length})
              </summary>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Bàn</th>
                    <th>Giờ gọi</th>
                    <th>Đã xử lý lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {doneCalls.map((c) => (
                    <tr key={c.id}>
                      <td>{tableLabel(tableNames, c.tableId)}</td>
                      <td>{formatTime(c.createdAt)}</td>
                      <td>{c.acknowledgedAt ? formatTime(c.acknowledgedAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </section>

        <hr className="hr" />

        <section>
          <h3>
            Đặt bàn mới {newReservations.length > 0 && <span className="tag tag-accent">{newReservations.length} chờ xác nhận</span>}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {newReservations.map((r) => {
              const overdue = !r.claimedBy && now - Date.parse(r.createdAt) > OVERDUE_MS;
              return (
                <div key={r.id} style={{ ...cardStyle(overdue, r.isLumiaGuest ? "var(--color-accent-2-100)" : "var(--color-neutral-100)"), gap: 6, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>
                      {r.time} · {r.date === today ? "Hôm nay" : r.date.split("-").reverse().join("/")}
                    </span>
                    <span className="text-muted" style={{ fontSize: 12 }}>{r.guests} khách</span>
                  </div>
                  <WaitBadge since={r.createdAt} now={now} label="Đặt" />
                  <div>
                    {r.customerName} ·{" "}
                    <a href={`tel:${r.phone}`} style={{ color: "var(--color-accent)", fontWeight: 700 }}>
                      {r.phone}
                    </a>
                  </div>
                  {(r.area || r.occasion) && <div>{[r.area, r.occasion && `🎉 ${r.occasion}`].filter(Boolean).join(" · ")}</div>}
                  {r.isLumiaGuest && (
                    <div style={{ fontWeight: 700 }}>
                      🏨 Lumia phòng {r.hotelRoom} {r.roomVerified ? "✓ QR" : "⚠ cần xác minh"} · -10%
                      {r.needShuttle && <div>🚐 Xe đón tại sảnh Lumia lúc {r.pickupTime}</div>}
                    </div>
                  )}
                  {r.note && <div>📝 {r.note}</div>}
                  <ClaimBar
                    claimedBy={r.claimedBy ?? null}
                    me={username}
                    busy={busyIds.has(r.id)}
                    onClaim={() => patchReservation(r.id, { claim: true })}
                    onRelease={() => patchReservation(r.id, { claim: false })}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} disabled={busyIds.has(r.id)} onClick={() => patchReservation(r.id, { status: "CONFIRMED" })}>
                      Đã gọi xác nhận
                    </button>
                    <button className="btn btn-danger" disabled={busyIds.has(r.id)} onClick={() => patchReservation(r.id, { status: "CANCELLED" })}>
                      Huỷ
                    </button>
                  </div>
                </div>
              );
            })}
            {newReservations.length === 0 && <p className="text-muted">Không có lượt đặt bàn nào chờ xác nhận.</p>}
          </div>

          {todayReservations.length > 0 && (
            <details open style={{ marginTop: 12 }}>
              <summary className="text-muted" style={{ cursor: "pointer", fontSize: 13 }}>
                Lịch đặt bàn hôm nay ({todayReservations.length})
              </summary>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Giờ</th>
                    <th>Khách</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {todayReservations.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.time}</b>
                        {r.needShuttle && (
                          <div style={{ fontSize: 12 }}>
                            🚐 đón {r.pickupTime} {r.shuttleDoneAt ? `· ✓ đã đón (${formatTime(r.shuttleDoneAt)})` : ""}
                          </div>
                        )}
                      </td>
                      <td>
                        {r.customerName} · {r.guests} khách
                        {r.isLumiaGuest && <div style={{ fontSize: 12 }}>Lumia phòng {r.hotelRoom}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{[r.area, r.note].filter(Boolean).join(" · ") || "—"}</td>
                      <td>
                        {r.status === "CONFIRMED" ? (
                          <button className="btn btn-secondary" disabled={busyIds.has(r.id)} onClick={() => patchReservation(r.id, { status: "SEATED" })}>
                            Khách đã đến
                          </button>
                        ) : r.status === "SEATED" ? (
                          "Đã đến"
                        ) : (
                          "Hoàn tất"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </section>

        <hr className="hr" />

        <section>
          <h3>Yêu cầu order {pendingOrders.length > 0 && <span className="tag tag-accent">{pendingOrders.length} đang chờ</span>}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {pendingOrders.map((o) => {
              const overdue = !o.claimedBy && now - Date.parse(o.createdAt) > OVERDUE_MS;
              return (
                <div key={o.id} style={cardStyle(overdue, "var(--color-neutral-100)")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>
                      {o.online ? o.tableId : `Bàn ${tableLabel(tableNames, o.tableId)}`}
                    </span>
                    <WaitBadge since={o.createdAt} now={now} />
                  </div>
                  {o.online && <OnlineOrderInfo online={o.online} note={o.note} />}
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {o.items.map((it) => (
                      <li key={it.id}>
                        {it.nameSnapshot} × {it.qty} <span className="text-muted">({formatVnd(it.lineTotal)})</span>
                        {it.note && <div style={{ color: "var(--color-accent)", fontSize: 12 }}>Ghi chú: {it.note}</div>}
                      </li>
                    ))}
                  </ul>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--color-accent)" }}>Tổng: {formatVnd(o.totalAmount)}</div>
                  <ClaimBar
                    claimedBy={o.claimedBy ?? null}
                    me={username}
                    busy={busyIds.has(o.id)}
                    onClaim={() => orderWorkflow(o.id, { action: "claim" })}
                    onRelease={() => orderWorkflow(o.id, { action: "unclaim" })}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} disabled={busyIds.has(o.id)} onClick={() => updateOrder(o.id, "CONFIRMED")}>
                      Xác nhận đã nhận đơn
                    </button>
                    <button className="btn btn-danger" disabled={busyIds.has(o.id)} onClick={() => openCancelDialog(o.id)}>
                      Huỷ
                    </button>
                  </div>
                </div>
              );
            })}
            {pendingOrders.length === 0 && <p className="text-muted">Không có đơn nào đang chờ.</p>}
          </div>
        </section>

        <hr className="hr" />

        <section>
          <h3>
            Đơn online: giao &amp; thu tiền {activeOnline.length > 0 && <span className="tag tag-accent-2">{activeOnline.length} đang xử lý</span>}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
            {activeOnline.map((o) => (
              <FulfillmentCard key={o.id} order={o} busy={busyIds.has(o.id)} onAction={(a) => orderWorkflow(o.id, a)} />
            ))}
            {activeOnline.length === 0 && <p className="text-muted">Không có đơn online nào đang chờ giao hoặc thu tiền.</p>}
          </div>
        </section>

        {doneOrders.length > 0 && (
          <details>
            <summary className="text-muted" style={{ cursor: "pointer", fontSize: 13 }}>
              Lịch sử đơn gần đây ({doneOrders.length})
            </summary>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Bàn / kênh</th>
                  <th>Giờ gửi</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Người xác nhận</th>
                </tr>
              </thead>
              <tbody>
                {doneOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.online ? `${o.tableId} · ${o.online.code}` : tableLabel(tableNames, o.tableId)}</td>
                    <td>{formatTime(o.createdAt)}</td>
                    <td>{formatVnd(o.totalAmount)}</td>
                    <td>
                      {o.status === "CANCELLED"
                        ? "Đã huỷ"
                        : o.online && o.fulfillment === "DELIVERED"
                          ? `Đã giao${o.paidAt ? " · đã thu tiền" : ""}`
                          : "Đã xác nhận"}
                    </td>
                    <td className="text-muted">{o.claimedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </main>

      {cancelOrderId && (
        <div className="confirm-backdrop" onClick={() => setCancelOrderId(null)}>
          <form
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              confirmCancelOrder();
            }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, color: "var(--color-accent)" }}>
              Lý do huỷ đơn
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
              Bắt buộc nhập lý do — được ghi lại để quản lý đối chiếu nếu cần.
            </p>
            <div className="field">
              <textarea
                className="input"
                rows={3}
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="VD: Khách đổi ý, gọi nhầm món, hết nguyên liệu..."
                required
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} type="submit" disabled={!cancelReasonInput.trim() || busyIds.has(cancelOrderId)}>
                Xác nhận huỷ
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setCancelOrderId(null)}>
                Đóng
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/** "Chờ 3 phút" — turns red after 2 minutes. */
function WaitBadge({ since, now, label = "Chờ" }: { since: string; now: number; label?: string }) {
  const mins = Math.max(0, Math.floor((now - Date.parse(since)) / 60000));
  const overdue = now - Date.parse(since) > OVERDUE_MS;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: overdue ? "#c0141c" : "var(--color-neutral-600)", whiteSpace: "nowrap" }}>
      {formatTime(since)} · {label} {mins < 1 ? "<1" : mins} phút
    </span>
  );
}

/** "Tôi nhận xử lý": shows who is on it so two people don't call the same guest. */
function ClaimBar({
  claimedBy,
  me,
  busy,
  onClaim,
  onRelease,
}: {
  claimedBy: string | null;
  me: string;
  busy: boolean;
  onClaim: () => void;
  onRelease: () => void;
}) {
  if (!claimedBy) {
    return (
      <button className="btn btn-secondary" disabled={busy} onClick={onClaim}>
        🙋 Tôi nhận xử lý
      </button>
    );
  }
  const mine = claimedBy === me;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 13,
        fontWeight: 700,
        background: mine ? "var(--color-accent-2-100)" : "var(--color-neutral-200)",
        padding: "4px 8px",
      }}
    >
      <span>🙋 {mine ? "Bạn đang xử lý" : `Đang xử lý: ${claimedBy}`}</span>
      {mine && (
        <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 6px", height: "auto" }} disabled={busy} onClick={onRelease}>
          Bỏ nhận
        </button>
      )}
    </div>
  );
}

/** Confirmed website order: kitchen progress, handover and payment. */
function FulfillmentCard({ order: o, busy, onAction }: { order: OrderDTO; busy: boolean; onAction: (a: OrderAction) => void }) {
  const on = o.online!;
  const done = o.items.filter((i) => i.kitchenStatus === "DONE").length;
  const pickup = on.channel === "PICKUP";
  const delivered = o.fulfillment === "DELIVERED";
  return (
    <div style={{ border: "2px solid var(--color-accent-2-500)", background: "var(--color-neutral-100)", padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>{o.tableId}</span>
        <span className="text-muted">
          {on.code} · {formatTime(o.createdAt)}
        </span>
      </div>
      <div>
        {on.customerName} ·{" "}
        <a href={`tel:${on.phone}`} style={{ color: "var(--color-accent)", fontWeight: 700 }}>
          {on.phone}
        </a>
      </div>
      {on.address && <div>📍 {on.address}</div>}
      <div>
        🍳 Bếp: {done}/{o.items.length} món xong · 💰 <b>{formatVnd(o.totalAmount)}</b>
      </div>
      <div style={{ fontWeight: 700 }}>
        {delivered
          ? `✓ ${pickup ? "Khách đã nhận món" : "Đã giao"} ${o.fulfilledAt ? formatTime(o.fulfilledAt) : ""} (${o.fulfilledBy ?? ""})`
          : o.fulfillment === "DELIVERING"
            ? `🛵 Đang giao — ${o.fulfilledBy ?? ""}`
            : pickup
              ? "⏳ Chờ khách đến lấy"
              : "⏳ Chưa đi giao"}
      </div>
      <div style={{ fontWeight: 700 }}>
        {o.paidAt
          ? `✓ Đã thu tiền (${o.paymentMethod === "TRANSFER" ? "chuyển khoản" : "tiền mặt"}) — ${o.paidBy ?? ""}`
          : "💵 Chưa thu tiền"}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {!delivered && !pickup && o.fulfillment !== "DELIVERING" && (
          <button className="btn btn-secondary" disabled={busy} onClick={() => onAction({ action: "delivering" })}>
            🛵 Bắt đầu giao
          </button>
        )}
        {!delivered && (
          <button className="btn btn-primary" disabled={busy} onClick={() => onAction({ action: "delivered" })}>
            {pickup ? "Khách đã nhận món" : "Đã giao xong"}
          </button>
        )}
        {!o.paidAt && (
          <>
            <button className="btn btn-secondary" disabled={busy} onClick={() => onAction({ action: "paid", method: "CASH" })}>
              Đã thu tiền mặt
            </button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => onAction({ action: "paid", method: "TRANSFER" })}>
              Đã nhận chuyển khoản
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const CHANNEL_LABEL = { PICKUP: "Khách đến lấy", DELIVERY: "Giao tận nơi", LUMIA_ROOM: "Giao về phòng Lumia" } as const;

/** Customer / delivery details for website orders — staff call to confirm before sending to the kitchen. */
function OnlineOrderInfo({ online, note }: { online: NonNullable<OrderDTO["online"]>; note: string | null }) {
  return (
    <div style={{ fontSize: 13, background: "var(--color-accent-2-100)", border: "1px solid var(--color-accent-2-300)", padding: "6px 8px" }}>
      <div style={{ fontWeight: 700 }}>
        {CHANNEL_LABEL[online.channel]} · Mã {online.code}
      </div>
      <div>
        {online.customerName} ·{" "}
        <a href={`tel:${online.phone}`} style={{ color: "var(--color-accent)", fontWeight: 700 }}>
          {online.phone}
        </a>
      </div>
      {online.address && <div>📍 {online.address}</div>}
      {online.channel === "LUMIA_ROOM" && (
        <div style={{ color: online.roomVerified ? "var(--color-accent-2-700)" : "var(--color-accent)", fontWeight: 700 }}>
          {online.roomVerified ? "✓ Phòng đã xác thực qua QR" : "⚠ Khách nhập tay — gọi xác minh số phòng"}
        </div>
      )}
      {online.scheduledTime && <div>⏰ {online.scheduledTime}</div>}
      {note && <div>📝 {note}</div>}
      {online.discount > 0 && <div>Đã trừ ưu đãi Lumia: -{formatVnd(online.discount)}</div>}
      {online.shippingFee > 0 && <div>Phí giao: {formatVnd(online.shippingFee)}</div>}
    </div>
  );
}
