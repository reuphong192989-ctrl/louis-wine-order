"use client";

import { usePush } from "@/lib/use-push";

/** One-line banner prompting staff to enable OS push alerts, so new orders/calls still ring when the screen is locked. */
export default function PushBanner() {
  const { status, subscribe } = usePush();

  if (status === "subscribed" || status === "unsupported") return null;

  if (status === "ios-needs-install") {
    return (
      <div style={{ background: "var(--color-neutral-200)", padding: "var(--space-2) var(--space-3)", fontSize: 13 }}>
        📱 Trên iPhone/iPad: bấm nút Chia sẻ → <b>Thêm vào MH chính</b>, rồi mở lại từ biểu tượng đó để nhận thông báo cả khi khoá máy.
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div style={{ background: "var(--color-neutral-200)", padding: "var(--space-2) var(--space-3)", fontSize: 13 }}>
        🔕 Thông báo đang bị chặn — vào cài đặt trình duyệt cho phép thông báo cho trang này để nhận chuông khi khoá máy.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--color-neutral-200)",
        padding: "var(--space-2) var(--space-3)",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span>🔔 Bật thông báo để vẫn nhận được chuông khi tắt màn hình.</span>
      <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={subscribe}>
        Bật thông báo
      </button>
    </div>
  );
}
