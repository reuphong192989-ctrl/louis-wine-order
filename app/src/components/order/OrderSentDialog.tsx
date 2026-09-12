"use client";

export default function OrderSentDialog({
  onClose,
  onCallStaff,
  callStaffDisabled,
}: {
  onClose: () => void;
  onCallStaff: () => void;
  callStaffDisabled: boolean;
}) {
  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, color: "var(--color-accent)" }}>
          Đã gửi yêu cầu
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>
          Yêu cầu của quý khách đã được gửi đi, vui lòng chờ trong giây lát, nhân viên phục vụ sẽ xác nhận.
        </p>
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
          Nếu chờ lâu quá, hãy nhấn nút &quot;Gọi nhân viên&quot; bên dưới.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <button className="btn btn-secondary btn-block" disabled={callStaffDisabled} onClick={onCallStaff}>
            Gọi nhân viên
          </button>
          <button className="btn btn-primary btn-block" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
