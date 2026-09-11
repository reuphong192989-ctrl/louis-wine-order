"use client";

export type ToastMsg = { id: number; text: string; tone?: "default" | "error" };

export default function Toast({ toasts }: { toasts: ToastMsg[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 100,
        alignItems: "center",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.tone === "error" ? "var(--color-accent)" : "var(--color-neutral-900)",
            color: "#fff",
            padding: "10px 16px",
            fontSize: 13,
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,.25)",
            maxWidth: "90vw",
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
