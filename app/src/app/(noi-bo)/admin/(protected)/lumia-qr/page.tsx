import QRCode from "qrcode";
import { allRooms } from "@/lib/site/lumia";
import { signRoom } from "@/lib/site/lumia-server";
import { LUMIA, siteUrl } from "@/lib/site/constants";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

/**
 * One signed QR per Lumia Apartment room. Scanning opens the restaurant home page
 * (guests don't know Louis Wine yet) with the room remembered and verified, so
 * the 10% discount and free room delivery apply when they order or book.
 * Card text is English first — most guests are foreign (many Russian-speaking).
 */
export default async function LumiaQrPage() {
  const base = siteUrl();
  const cards = await Promise.all(
    allRooms().map(async ({ floor, room }) => {
      const url = `${base}/?room=${room}&k=${signRoom(room)}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#2b1a12", light: "#ffffff" } });
      return { floor, room, svg };
    }),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Mã QR phòng Lumia Apartment</h3>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {cards.length} mã ({LUMIA.floors} tầng × {LUMIA.roomsPerFloor} phòng). Quét mã → trang giới thiệu nhà hàng (tiếng Anh, đổi được
          sang Nga/Việt), số phòng được ghi nhận sẵn. Mỗi mã có chữ ký riêng, khách không sửa được số phòng.
        </span>
        <div style={{ marginLeft: "auto" }}>
          <PrintButton />
        </div>
      </div>
      {!process.env.LUMIA_QR_SECRET && (
        <p className="no-print" style={{ border: "2px solid var(--color-accent)", background: "var(--color-accent-100)", padding: 12, margin: 0 }}>
          ⚠️ Chưa cấu hình <b>LUMIA_QR_SECRET</b> trên Vercel — mã QR đang dùng khoá mặc định (có trong mã nguồn công khai), người ngoài có
          thể tự tạo mã giả. Hãy đặt biến này <b>trước khi in</b>; đổi khoá sau khi in sẽ làm toàn bộ mã đã dán mất hiệu lực.
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <div key={c.room} style={{ border: "2px solid var(--color-accent)", background: "#fff", padding: 14, textAlign: "center", breakInside: "avoid" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="" width={40} height={40} style={{ margin: "0 auto" }} />
            <div style={{ fontWeight: 800, color: "var(--color-accent)", letterSpacing: "0.04em" }}>LOUIS WINE × LUMIA</div>
            <div style={{ fontSize: 11, color: "#6b5a4a" }}>Restaurant &amp; Wine Cellar · 5 km</div>
            <div style={{ width: 150, height: 150, margin: "8px auto" }} dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div style={{ fontSize: 24, fontWeight: 800 }}>Room {c.room}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-accent)", marginTop: 6 }}>Scan to discover our restaurant</div>
            <div style={{ fontSize: 11 }}>10% off · Free room delivery · Free shuttle</div>
            <div style={{ fontSize: 11, color: "#6b5a4a", marginTop: 4 }}>RU: Скидка 10% · Доставка в номер · Трансфер</div>
            <div style={{ fontSize: 10, color: "#8a7a6a" }}>VI: Giảm 10% · Giao về phòng · Xe đưa đón</div>
          </div>
        ))}
      </div>
    </div>
  );
}
