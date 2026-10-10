"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatVnd } from "@/lib/format";
import { buildVietQrPayload, findBankBin } from "@/lib/vietqr";

type Account = { bank: string; number: string; holder: string };

/** VietQR for the chosen account with the exact amount and a transfer note pre-filled — guest scans it with any banking app. */
export default function TransferQr({ account, amount, note, title }: { account: Account; amount: number; note: string; title: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const bin = findBankBin(account.bank);

  useEffect(() => {
    if (!bin || !account.number) {
      setSrc(null);
      return;
    }
    const payload = buildVietQrPayload({ bin, accountNo: account.number, amount, note });
    QRCode.toDataURL(payload, { margin: 1, width: 360, errorCorrectionLevel: "M" })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [bin, account.number, amount, note]);

  if (!bin) {
    return (
      <div style={{ color: "var(--color-accent)", fontSize: 13 }}>
        Không tạo được mã QR — tên ngân hàng &quot;{account.bank}&quot; chưa được nhận diện. Quản lý vào Quản trị → Tích hợp chọn lại ngân hàng.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", border: "2px solid var(--color-accent)", background: "#fff", padding: 12 }}>
      {src ? <img src={src} alt="Mã QR chuyển khoản" width={220} height={220} /> : <div style={{ width: 220, height: 220 }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: "#111" }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
        <div>{account.bank}</div>
        <div>
          STK: <b style={{ fontSize: 16, letterSpacing: 1 }}>{account.number}</b>
        </div>
        <div>Chủ TK: {account.holder}</div>
        <div style={{ marginTop: 6 }}>
          Số tiền: <b style={{ fontSize: 20, color: "var(--color-accent)" }}>{formatVnd(amount)}</b>
        </div>
        <div className="text-muted" style={{ fontSize: 12 }}>Nội dung: {note}</div>
        <div className="text-muted" style={{ fontSize: 12 }}>Khách quét bằng app ngân hàng bất kỳ — số tiền và nội dung điền sẵn.</div>
      </div>
    </div>
  );
}
