/**
 * Seeds the Google Sheet (used as the app's database) with the real 91-item
 * menu (14 food categories, from the restaurant's original Excel draft) plus
 * a placeholder wine category, the "Món Nổi Bật" highlight flags, and the
 * default admin/staff accounts. Matches the Claude Design handoff at
 * project/design_handoff_menu_tu_order/design/Louis Wine Menu Tu Order.dc.html
 *
 * Requires GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL,
 * GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in the environment (.env.local).
 * Run with: npm run seed
 */
import { randomUUID } from "crypto";
import "./load-env";
import { ensureTab, appendRows, cell } from "../src/lib/sheets/core";
import { CATEGORIES_TAB, CATEGORIES_HEADERS, listCategories } from "../src/lib/sheets/categories";
import { MENU_ITEMS_TAB, MENU_ITEMS_HEADERS, listAllMenuItems } from "../src/lib/sheets/menuItems";
import { USERS_TAB, USERS_HEADERS, findUserByUsername } from "../src/lib/sheets/users";
import { hashPassword } from "../src/lib/auth";

type RawItem = {
  name: string;
  note?: string;
  price: string;
  image?: string; // filename under public/uploads
  highlight?: boolean;
};

type RawCategory = { slug: string; name: string; items: RawItem[] };

const CATEGORIES: RawCategory[] = [
  {
    slug: "vang-do",
    name: "Rượu Vang Đỏ",
    items: [
      { name: "Château Reference Rouge", note: "Bordeaux, Pháp", price: "Đang cập nhật" },
      { name: "Riserva Esempio", note: "Tuscany, Ý", price: "Đang cập nhật" },
      { name: "Cabernet Sauvignon Mẫu", note: "Napa Valley, Mỹ", price: "Đang cập nhật" },
      { name: "Malbec Referencia", note: "Mendoza, Argentina", price: "Đang cập nhật" },
    ],
  },
  {
    slug: "khai-vi",
    name: "Khai Vị",
    items: [
      { name: "Bò một nắng Tây Bắc", price: "268.000đ", image: "bo-mot-nang.jpg", highlight: true },
      { name: "Mực một nắng nướng", price: "428.000đ", image: "muc-mot-nang.jpg", highlight: true },
      { name: "Mực khô nướng", price: "388.000đ" },
      { name: "Chả mực thượng hạng", price: "269.000đ" },
      { name: "Chả giò hải sản", price: "229.000đ" },
      { name: "Chả bò chiên", price: "228.000đ" },
      { name: "Tôm một nắng nướng", price: "Thời giá" },
      { name: "Pate Louis", price: "168.000đ", image: "pate.jpg", highlight: true },
      { name: "Xôi nếp mini Điện Biên", note: "/đĩa", price: "168.000đ", image: "xoi-dien-bien.jpg" },
      { name: "Bò Louis", price: "128.000đ" },
      { name: "Đậu hũ non chả bông", price: "99.000đ" },
      { name: "Khoai tây chiên", price: "99.000đ" },
      { name: "Bánh mỳ bơ tỏi", price: "68.000đ" },
      { name: "Bánh mỳ (giỏ)", price: "50.000đ" },
    ],
  },
  {
    slug: "mon-au",
    name: "Món Âu",
    items: [
      { name: "Gan ngỗng Pháp", note: "áp chảo, sốt táo", price: "428.000đ" },
      { name: "Bò Fuji nướng", note: "sốt tiêu xanh / sốt nấm", price: "488.000đ" },
      { name: "Cá tuyết Pháp nướng", note: "sốt cam chanh", price: "488.000đ" },
      { name: "Sườn cừu nướng", note: "lá hương thảo", price: "388.000đ" },
      {
        name: "Bò Tomahawk nướng - Dát vàng (Signature)",
        note: "tảng 1,2kg, phủ vàng lá 24k, phục vụ tại bàn",
        price: "2.680.000 - 3.080.000đ",
      },
    ],
  },
  {
    slug: "do-nguoi-pho-mai",
    name: "Đồ Nguội & Phô Mai",
    items: [
      { name: "Phô mai tổng hợp đặc biệt", price: "728.000đ" },
      { name: "Đồ nguội tổng hợp", price: "528.000đ" },
      { name: "Phô mai tổng hợp", price: "428.000đ" },
      { name: "Heo Iberico 36 tháng", price: "328.000đ", image: "heo-iberico.jpg", highlight: true },
      { name: "Xúc xích Ba Lan", price: "228.000đ", image: "xuc-xich-ba-lan.jpg", highlight: true },
      { name: "Ô liu hương hoa", price: "198.000đ" },
      { name: "Phô mai Nga xông khói", price: "148.000đ" },
    ],
  },
  {
    slug: "salad-goi",
    name: "Salad & Gỏi",
    items: [
      { name: "Salad cá hồi", note: "sốt chanh dây", price: "298.000đ", image: "salad-ca-hoi.png", highlight: true },
      { name: "Salad cá ngừ rong nho", price: "248.000đ" },
      { name: "Salad hoa quả theo mùa", price: "228.000đ" },
      { name: "Salad xoài xanh bò khô", price: "198.000đ" },
      { name: "Gỏi bò Louis", price: "198.000đ", image: "goi-bo.jpg", highlight: true },
      { name: "Gỏi sứa xoài xanh", note: "kiểu Hàn Quốc", price: "198.000đ", image: "goi-sua.jpg", highlight: true },
      { name: "Gỏi chuối rừng", price: "168.000đ" },
    ],
  },
  {
    slug: "soup",
    name: "Soup",
    items: [
      { name: "Soup bào ngư thịt cua", note: "/phần", price: "350.000đ" },
      { name: "Soup kim ngư hầm trái bí", price: "350.000đ" },
      { name: "Soup hải sản trứng cá chuồn Nhật", price: "168.000đ" },
      { name: "Soup măng tây hải sản", price: "128.000đ" },
      { name: "Soup bí đỏ kem tươi", price: "125.000đ" },
      { name: "Soup rau dền trứng bắc thảo", price: "90.000đ" },
    ],
  },
  {
    slug: "mon-ga-que",
    name: "Món Gà Quê",
    items: [
      { name: "Gà H'Mông", note: "hấp/chiên mắm/rang muối/nướng - đặt trước ≥1 giờ", price: "569.000đ" },
      { name: "Gà tre", note: "hấp/chiên mắm/rang muối/nướng - đặt trước ≥1 giờ", price: "468.000đ" },
      {
        name: "Gà Đông Tảo",
        note: "/kg - hấp xôi/nấu khoai sọ/quay cay",
        price: "428.000đ",
        image: "ga-dong-tao.jpg",
        highlight: true,
      },
      { name: "Gà đen tiềm trái dừa", price: "228.000đ", image: "ga-den-tiem-trai-dua.jpg" },
      { name: "Chim câu", note: "/con - tiềm hoa đông trùng/nướng mọi/quay ngũ vị", price: "280.000đ" },
    ],
  },
  {
    slug: "mon-dac-trung",
    name: "Món Đặc Trưng",
    items: [
      { name: "Heo Iberico 36 tháng", note: "trùng với mục Đồ Nguội & Phô Mai", price: "328.000đ", image: "heo-iberico.jpg" },
      { name: "Gỏi chuối rừng", note: "trùng với mục Salad & Gỏi", price: "168.000đ" },
      { name: "Bào Ngư hấp miến tỏi", price: "Đang cập nhật", image: "bao-ngu-hap-mien-toi.jpg", highlight: true },
      { name: "Bò Fuji nướng", note: "trùng với mục Món Âu", price: "488.000đ" },
    ],
  },
  {
    slug: "ca-theo-con",
    name: "Cá Theo Con",
    items: [
      {
        name: "Cá Bơn Hàn Quốc",
        note: "sashimi/cháo/hấp Thái/hấp HK/nướng Mã Lai/chiên Tứ Xuyên",
        price: "Thời giá",
        image: "ca-bon-han.jpg",
        highlight: true,
      },
      {
        name: "Cá Song (song / mú)",
        note: "sashimi/nấu mẻ/hấp thảo mộc/hấp tương tàu xì/hấp Thái/hấp HK/chiên tỏi ớt/nướng tương Mã Lai",
        price: "Thời giá",
        image: "ca-song.jpg",
      },
      { name: "Cá Chim Trắng", note: "hấp tương đậu/hấp Thái/hấp HK/chiên tỏi ớt/chiên chua ngọt/nướng Mã Lai", price: "Thời giá" },
      {
        name: "Cá Chình",
        note: "nướng Mã Lai/hấp sốt XO/nướng sốt nghệ đỏ Tây Bắc/rang muối HK/om chuối đậu/nấu mẻ",
        price: "Thời giá",
        image: "ca-trinh.jpg",
        highlight: true,
      },
    ],
  },
  {
    slug: "tran-pham-dai-duong",
    name: "Trân Phẩm Đại Dương",
    items: [
      {
        name: "Cua Gạch / Cua Thịt",
        note: "sốt chilli Singapore/sốt tiêu đen/sốt cà ri vàng/hấp hành gừng/miến xào tay cầm/hấp rượu hoa tiêu/rang me/nướng muối hột",
        price: "Thời giá",
        image: "cua-gach.jpg",
      },
      {
        name: "Tôm Hùm Bông",
        note: "chiên sốt trứng muối/rang muối ớt/hấp nước dừa/hấp miến tỏi/sốt phô mai lò",
        price: "Thời giá",
        image: "tom-hum-bong.png",
        highlight: true,
      },
      {
        name: "Tôm Sú Biển · Càng Xanh",
        note: "chiên sốt trứng muối/sốt bơ tỏi/rang muối ớt/hấp miến tỏi/hấp nước dừa/xào miến thố tay cầm",
        price: "Thời giá",
        image: "tom-su.jpg",
        highlight: true,
      },
      { name: "Tôm Tít", note: "rang muối ớt/hấp/sốt bơ tỏi/sốt me/sốt tỏi", price: "Thời giá" },
      { name: "Bào Ngư", note: "sashimi/hấp tỏi uyên ương/nấu cháo bạch quả", price: "Thời giá" },
      { name: "Ốc Hương", note: "hấp sả/sốt bơ tỏi/xào me/sốt trứng muối/nướng lửa hồng tiêu xanh", price: "Thời giá" },
      {
        name: "Ốc Vòi Voi",
        note: "sashimi/cháo bạch quả/xào tương Mã Lai/xào tương XO",
        price: "Thời giá",
        image: "oc-voi-voi.jpg",
        highlight: true,
      },
      { name: "Sò Dương", note: "8-10 con/kg - nướng mỡ hành/sốt tương XO/hấp tỏi uyên ương", price: "Thời giá" },
      { name: "Sò Huyết Cồ", note: "30-40 con/kg - nướng mọi/chần sốt Thái", price: "Thời giá" },
    ],
  },
  {
    slug: "lau",
    name: "Lẩu",
    items: [
      { name: "Lẩu hải sản chua cay", note: "/nồi", price: "1.088.000đ" },
      { name: "Lẩu baba rượu vang", note: "/kg", price: "1.080.000đ", image: "ba-ba-nau-ruou-vang.jpg", highlight: true },
      { name: "Lẩu gà nhúng lá giang", note: "/nồi", price: "790.000đ", image: "lau-ga-la-giang.jpg", highlight: true },
      { name: "Lẩu riêu cua bắp bò sườn sụn", note: "/nồi", price: "788.000đ" },
      { name: "Lẩu nấm chim câu", note: "/nồi", price: "728.000đ" },
    ],
  },
  {
    slug: "mon-nhau",
    name: "Món Nhậu",
    items: [
      { name: "Sườn non nướng BBQ", price: "628.000đ" },
      { name: "Chân giò chiên Filipin", price: "588.000đ" },
      { name: "Bò cháy tỏi tiêu xanh", price: "428.000đ" },
      { name: "Đuôi lợn luộc", price: "288.000đ" },
      { name: "Ếch chiên giòn", price: "228.000đ" },
    ],
  },
  {
    slug: "rau",
    name: "Rau",
    items: [
      { name: "Cải thìa xào nấm đông cô", price: "189.000đ" },
      { name: "Củ quả luộc chấm kho quẹt", price: "179.000đ" },
      { name: "Bông bí xào tỏi", price: "128.000đ" },
      { name: "Mùng tơi xào tỏi", price: "128.000đ" },
      { name: "Rau muống xào tỏi", price: "128.000đ", image: "rau-muong-xao-toi.jpg", highlight: true },
      { name: "Rau rừng xào tỏi", price: "99.000đ", image: "rau-rung.jpg" },
      { name: "Rau rừng luộc kho quẹt", price: "99.000đ", image: "rau-rung.jpg" },
    ],
  },
  {
    slug: "com-my-mien-chao",
    name: "Cơm - Mỳ - Miến - Cháo",
    items: [
      { name: "Cơm chiên hải sản", price: "248.000đ", image: "com-chien-hai-san.jpg", highlight: true },
      { name: "Cơm chiên cá mặn", price: "188.000đ" },
      { name: "Mỳ xào hải sản", price: "248.000đ" },
      { name: "Miến xào hải sản", price: "248.000đ" },
      { name: "Mỳ xào bò", price: "188.000đ" },
      { name: "Cháo hải sản", price: "168.000đ", image: "chao-hai-san.jpg", highlight: true },
      { name: "Cháo hàu", price: "128.000đ" },
      { name: "Cháo thịt bò bằm", price: "78.000đ" },
    ],
  },
  {
    slug: "canh",
    name: "Canh",
    items: [
      { name: "Canh nghêu nấu chua", note: "phục vụ theo nồi, cho 4-6 khách", price: "169.000đ" },
      { name: "Canh rau dền tôm tươi", note: "phục vụ theo nồi, cho 4-6 khách", price: "169.000đ" },
      { name: "Canh nghêu mùng tơi", note: "phục vụ theo nồi, cho 4-6 khách", price: "149.000đ" },
      { name: "Canh cải thịt băm", note: "phục vụ theo nồi, cho 4-6 khách", price: "108.000đ" },
      { name: "Canh cua mùng tơi", note: "phục vụ theo nồi, cho 4-6 khách", price: "149.000đ" },
    ],
  },
];

function parsePriceValue(price: string): number | null {
  const m = price.match(/^([\d.]+)đ$/);
  if (!m) return null;
  return parseInt(m[1].replace(/\./g, ""), 10);
}

const ORDERS_HEADERS = ["id", "tableId", "status", "totalAmount", "note", "createdAt", "confirmedAt", "cancelledAt"];
const ORDER_ITEMS_HEADERS = ["id", "orderId", "menuItemId", "nameSnapshot", "unitPrice", "qty", "lineTotal", "kitchenStatus", "note"];

async function main() {
  console.log("Đảm bảo các tab (sheet con) đã tồn tại...");
  await ensureTab(CATEGORIES_TAB, CATEGORIES_HEADERS);
  await ensureTab(MENU_ITEMS_TAB, MENU_ITEMS_HEADERS);
  await ensureTab("Orders", ORDERS_HEADERS);
  await ensureTab("OrderItems", ORDER_ITEMS_HEADERS);
  await ensureTab("StaffCalls", ["id", "tableId", "status", "createdAt", "acknowledgedAt"]);
  await ensureTab(USERS_TAB, USERS_HEADERS);

  const existingCategories = await listCategories();
  const existingItems = await listAllMenuItems();
  if (existingCategories.length > 0 || existingItems.length > 0) {
    console.log(
      `Sheet đã có sẵn ${existingCategories.length} danh mục / ${existingItems.length} món — bỏ qua seed menu để tránh trùng lặp. Xoá dữ liệu trong tab Categories/MenuItems nếu muốn seed lại từ đầu.`
    );
  } else {
    console.log("Seeding categories + menu items (2 bulk API calls)...");

    const categoryRows = CATEGORIES.map((cat, ci) => ({
      id: randomUUID(),
      slug: cat.slug,
      name: cat.name,
      sortOrder: cell.int(ci),
    }));

    const itemRows: Record<string, string>[] = [];
    CATEGORIES.forEach((cat, ci) => {
      const categoryId = categoryRows[ci].id;
      cat.items.forEach((it, ii) => {
        itemRows.push({
          id: randomUUID(),
          categoryId,
          name: it.name,
          note: cell.str(it.note ?? null),
          priceText: it.price,
          priceValue: cell.num(parsePriceValue(it.price)),
          imageUrl: cell.str(it.image ? `/uploads/${it.image}` : null),
          isHighlight: cell.bool(!!it.highlight),
          available: cell.bool(true),
          sortOrder: cell.int(ii),
        });
      });
    });

    await appendRows(CATEGORIES_TAB, CATEGORIES_HEADERS, categoryRows);
    await appendRows(MENU_ITEMS_TAB, MENU_ITEMS_HEADERS, itemRows);
    console.log(`Đã seed ${categoryRows.length} danh mục / ${itemRows.length} món.`);
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "louiswine-admin";
  const staffPassword = process.env.SEED_STAFF_PASSWORD || "louiswine-staff";

  const userRows: Record<string, string>[] = [];
  if (!(await findUserByUsername("admin"))) {
    userRows.push({ id: randomUUID(), username: "admin", passwordHash: await hashPassword(adminPassword), role: "ADMIN" });
  }
  if (!(await findUserByUsername("staff"))) {
    userRows.push({ id: randomUUID(), username: "staff", passwordHash: await hashPassword(staffPassword), role: "STAFF" });
  }
  await appendRows(USERS_TAB, USERS_HEADERS, userRows);

  console.log(`Đã seed tài khoản mặc định: admin/${adminPassword}, staff/${staffPassword}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
