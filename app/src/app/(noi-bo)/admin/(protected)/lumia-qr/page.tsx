import QRCode from "qrcode";
import { allRooms } from "@/lib/site/lumia";
import { signRoom } from "@/lib/site/lumia-server";
import { LUMIA, siteUrl } from "@/lib/site/constants";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

/** One signed QR per Lumia Apartment room — scanning opens /lumia with the room pre-filled and verified. */
export default async function LumiaQrPage() {
  const base = siteUrl();
  const cards = await Promise.all(
    allRooms().map(async ({ floor, room }) => {
      const url = `${base}/lumia?room=${room}&k=${signRoom(room)}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#2b1a12", light: "#ffffff" } });
      return { floor, room, svg };
    }),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Mã QR phòng Lumia Apartment</h3>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {cards.length} mã ({LUMIA.floors} tầng × {LUMIA.roomsPerFloor} phòng). Mỗi mã có chữ ký riêng, khách không sửa được số phòng.
        </span>
        <div style={{ marginLeft: "auto" }}>
          <PrintButton />
        </div>
      </div>
      {!process.env.LUMIA_QR_SECRET && (
        <p className="no-print" style={{ border: "2px solid var(--color-accent)", background: "var(--color-accent-100)", padding: 12, margin: 0 }}>
          ⚠️ Chưa cấu hình <b>LUMIA_QR_SECRET</b> trên Vercel — mã QR đang dùng khoá mặc định, người ngoài có thể tự tạo mã giả.
          Hãy đặt biến này <b>trước khi in</b>; đổi khoá sau khi in sẽ làm toàn bộ mã đã dán mất hiệu lực.
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <div key={c.room} style={{ border: "2px solid var(--color-accent)", background: "#fff", padding: 16, textAlign: "center", breakInside: "avoid" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="" width={40} height={40} style={{ margin: "0 auto" }} />
            <div style={{ fontWeight: 800, color: "var(--color-accent)" }}>LOUIS WINE × LUMIA</div>
            <div style={{ width: 150, height: 150, margin: "8px auto" }} dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div style={{ fontSize: 24, fontWeight: 800 }}>Phòng {c.room}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>Tầng {c.floor}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-accent)", marginTop: 6 }}>Quét để đặt món · Giảm 10% · Free ship về phòng</div>
            <div style={{ fontSize: 11 }}>Đặt bàn: giảm 10% + xe đưa đón miễn phí</div>
          </div>
        ))}
      </div>
    </div>
  );
}
