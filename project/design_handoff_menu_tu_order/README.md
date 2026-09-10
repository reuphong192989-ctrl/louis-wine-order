# Handoff: Louis Wine — Menu Tự Order (Đi Vào Hoạt Động Thực Tế)

## Overview
Louis Wine là nhà hàng hầm rượu vang cao cấp tại Đà Nẵng. Bộ tài liệu này chuyển giao thiết kế "Menu tự order" (khách order trực tiếp trên tablet/QR tại bàn, giống mô hình đối thủ SOS Food & Beverage nhưng theo bộ nhận diện Louis Wine) để triển khai thành ứng dụng thực tế, có backend quản trị.

Mục tiêu sản phẩm thực tế:
- Khách tại bàn xem menu, tìm món, thêm vào giỏ hàng, gửi yêu cầu order tới nhân viên.
- Khách bấm "Gọi nhân viên" gửi thông báo tới màn hình/thiết bị của nhân viên phục vụ.
- Quản trị viên (admin/quản lý nhà hàng) có thể tự cập nhật: danh mục, tên món, mô tả, giá, ảnh món, trạng thái còn/hết hàng — không cần sửa code.

## About the Design Files
Các file trong `design/` là **thiết kế tham khảo viết bằng HTML** (Design Component chạy trên nền tảng nội bộ của bên thiết kế) — dùng để thể hiện đúng bố cục, màu sắc, hành vi tương tác dự kiến. **Đây không phải code production để copy thẳng vào app.** Nhiệm vụ của Claude Code là **tái tạo lại thiết kế này trong môi trường/kiến trúc thực tế của dự án** (ví dụ: React + Node/Express + Postgres, hoặc Next.js full-stack, hoặc framework khác nếu team đã có sẵn stack) — dùng đúng pattern, thư viện, quy ước của codebase đó. Nếu chưa có codebase nào, hãy chọn stack phù hợp nhất cho một ứng dụng order tại bàn có thời gian thực (real-time) và có trang quản trị.

## Fidelity
**High-fidelity (hifi)** — thiết kế đã có màu sắc, typography, khoảng cách, bố cục cuối cùng theo bộ nhận diện Louis Wine (burgundy / vàng đồng / nâu gỗ sồi). Lập trình viên nên tái tạo pixel-gần-đúng phần giao diện khách hàng; phần giao diện quản trị (chưa có mock riêng) có thể tự thiết kế theo cùng tông màu, ưu tiên tính rõ ràng/hiệu quả vận hành hơn là làm đẹp.

## Screens / Views

### 1. Màn hình Menu tự order (khách hàng) — `design/Louis Wine Menu Tu Order.dc.html`
**Purpose:** Khách ngồi tại bàn duyệt menu theo danh mục, tìm kiếm món, thêm vào giỏ, xem giỏ hàng, gửi yêu cầu order; gọi nhân viên khi cần.

**Layout:** Ứng dụng dạng "kiosk" full-viewport (thiết kế mẫu ở 1280×832, cần làm responsive cho tablet 10–13"), chia 3 vùng dọc:
- Header cố định trên cùng (`flex:none`), cao ~60px.
- Vùng nội dung chính `flex:1`, chia ngang: sidebar trái 220px cố định + khu vực lưới món bên phải (cuộn dọc độc lập).
- Footer cố định dưới cùng (`flex:none`).
- Giỏ hàng hiện dưới dạng drawer trượt từ phải, rộng 380px, đè lên toàn màn hình với lớp phủ tối (backdrop) phía sau.

**Components:**

*Header* (`background: var(--color-neutral-100) #f8f0e2`, viền dưới 2px màu `#a8823a`):
- Logo chữ "LOUIS WINE" — Archivo 800, 20px, màu burgundy `#7c2128`, letter-spacing 0.04em.
- Tag "Bàn 07" — style `.tag.tag-outline` (viền, không nền) — số bàn cần lấy dynamic theo mã QR/thiết bị thực tế, không hard-code.
- Nút "Gọi nhân viên" — button secondary (viền, nền trong suốt, hover nhẹ).
- Ô tìm kiếm — input rộng tối đa 420px, placeholder "Nhập tên món...", lọc theo tên món realtime (client-side filter là đủ, hoặc query API nếu danh mục lớn).
- Nút "Giỏ hàng" — button primary nền burgundy `#7c2128`, chữ trắng; có badge tròn màu vàng đồng `#b08d3d` ở góc trên-phải hiển thị số lượng món trong giỏ (ẩn khi = 0).

*Sidebar danh mục* (nền nâu sồi đậm `var(--color-neutral-800) #402f1e`, chữ kem `#f8f0e2`):
- Danh sách nút full-width, mỗi nút cao ~40px (padding 10px 16px), font Archivo 13px, đường viền dưới mờ giữa các nút.
- Danh mục đang chọn: nền burgundy `#7c2128`, chữ trắng, đậm 700.
- Danh mục hiện có (đúng thứ tự): Món Nổi Bật, Rượu Vang Đỏ, Khai Vị, Món Âu, Đồ Nguội & Phô Mai, Salad & Gỏi, Soup, Món Gà Quê, Món Đặc Trưng, Cá Theo Con, Trân Phẩm Đại Dương, Lẩu, Món Nhậu, Rau, Cơm-Mỳ-Miến-Cháo, Canh.

*Lưới món* (khu vực chính, nền `var(--color-bg) #efe3cf`, padding 20px 24px):
- Tiêu đề danh mục đang xem (h3), hoặc `Kết quả cho "<từ khoá>"` khi đang tìm kiếm (tìm across toàn bộ danh mục, không giới hạn danh mục đang chọn).
- Grid `repeat(auto-fill, minmax(180px, 1fr))`, gap 14px.
- Mỗi thẻ món (`background: var(--color-neutral-100)`, viền 1px `#a8823a`):
  - Ảnh món tỉ lệ 4:3, `object-fit: cover` (chỉ hiện nếu món có ảnh — món chưa có ảnh thì ẩn hẳn phần ảnh, không để trống xấu).
  - Tên món — Archivo 700, 14px.
  - Ghi chú/cách chế biến (nếu có) — chữ mờ (`text-muted`), 11px.
  - Dòng giá + nút thêm: giá bên trái màu burgundy đậm 13px 700; nút "+" hình tròn 28px nền vàng đồng `#b08d3d`, chữ nâu sồi đậm, chỉ hiện khi món **có giá cố định** (orderable=true).
  - Món có giá dạng "Thời giá" hoặc "Đang cập nhật" (hải sản tươi sống theo cân, rượu vang chưa chốt giá) → **không hiện nút "+"**, chỉ hiện nhãn giá dạng text. Khách muốn order món này phải qua "Gọi nhân viên".

*Footer* (nền `var(--color-neutral-100)`, viền trên 2px):
- Trái: dòng chữ nhỏ "Giá chưa bao gồm VAT. Hải sản tươi sống theo thời giá."
- Phải: tổng tiền giỏ hàng (Archivo 800, màu burgundy) + nút "Xem giỏ hàng (n)" primary.

*Giỏ hàng (drawer)*:
- Backdrop tối `rgba(43,26,18,.5)` phủ toàn màn hình, bấm vào backdrop = đóng giỏ.
- Panel 380px, nền `var(--color-bg)`, viền trái 2px vàng đồng.
- Header panel: "Giỏ hàng" + nút "Đóng" (ghost).
- Danh sách dòng món: tên món + `đơn giá × số lượng` (chữ mờ) bên trái; bộ tăng/giảm số lượng (nút vuông 22px viền, số ở giữa) ở giữa; tổng tiền dòng bên phải (đậm 700).
- Giảm số lượng xuống 0 → tự xoá dòng khỏi giỏ.
- Rỗng → hiện "Chưa có món nào trong giỏ." (chữ mờ).
- Footer panel: dòng "Tổng" + số tiền tổng (đậm 800, màu burgundy), nút "Gửi yêu cầu tới nhân viên" (primary, full-width) — **đây là hành động chính cần nối vào backend thực (xem phần Interactions).**

### 2. Trang quản trị (chưa có mock — cần Claude Code tự thiết kế)
Cùng tông màu, cần tối thiểu các view:
- Đăng nhập quản trị (phân quyền: quản lý / nhân viên phục vụ).
- Quản lý danh mục (thêm/sửa/xoá/sắp xếp thứ tự danh mục).
- Quản lý món trong danh mục: tên, mô tả/ghi chú, giá (hoặc đánh dấu "Thời giá"/"Đang cập nhật"), ảnh (upload), trạng thái Đang bán / Hết hàng (ẩn khỏi menu khách ngay khi đổi).
- Màn hình nhận yêu cầu real-time cho nhân viên: danh sách "Gọi nhân viên" theo bàn (kèm giờ gọi, trạng thái đã xử lý/chưa) và danh sách "Yêu cầu order" theo bàn (chi tiết món + số lượng + tổng tiền, nút xác nhận đã nhận đơn).

## Interactions & Behavior
- **Chọn danh mục:** click nút sidebar → cập nhật danh mục đang xem, xoá từ khoá tìm kiếm nếu có, cuộn khu vực lưới món về đầu.
- **Tìm kiếm:** gõ vào input → lọc theo tên món (không phân biệt hoa/thường) trên toàn bộ menu, tiêu đề danh mục ẩn, thay bằng "Kết quả cho ...". Không có debounce bắt buộc nhưng nên debounce ~200ms nếu tìm kiếm gọi API.
- **Thêm vào giỏ:** click "+" trên thẻ món có giá cố định → tăng số lượng dòng tương ứng trong giỏ (tạo dòng mới nếu chưa có), hiện/update badge số lượng trên nút giỏ hàng ở header. Món "Thời giá" không có nút "+".
- **Sửa số lượng trong giỏ:** nút +/- trên từng dòng; về 0 thì xoá dòng.
- **Mở/đóng giỏ hàng:** click nút "Giỏ hàng" (header) hoặc "Xem giỏ hàng" (footer) → mở drawer; click "Đóng" hoặc click ra ngoài (backdrop) → đóng. Click trong panel không được đóng (chặn `stopPropagation`).
- **Gửi yêu cầu tới nhân viên (production — quan trọng nhất):** khi khách bấm nút này trong drawer giỏ hàng:
  1. Gửi request lên backend: số bàn, danh sách món (tên/id món, số lượng, đơn giá, tổng dòng), tổng tiền, thời điểm gửi.
  2. Backend lưu đơn + đẩy realtime (WebSocket/Server-Sent Events/Firebase, tuỳ stack) tới màn hình/app của nhân viên phụ trách khu vực bàn đó.
  3. Sau khi gửi thành công: hiện trạng thái xác nhận cho khách (ví dụ đổi nút thành "Đã gửi yêu cầu — nhân viên sẽ tới ngay", disable nút vài giây hoặc cho tới khi nhân viên xác nhận), **không tự xoá giỏ hàng** cho tới khi nhân viên xác nhận đơn (để tránh mất dữ liệu nếu gửi lỗi).
  4. Xử lý lỗi mạng: hiện thông báo lỗi, cho phép gửi lại, không mất dữ liệu giỏ hàng đã nhập.
- **Gọi nhân viên:** click nút "Gọi nhân viên" ở header → gửi realtime tới nhân viên (số bàn + giờ gọi), hiện phản hồi ngắn cho khách (ví dụ toast "Đã gửi yêu cầu, nhân viên sẽ tới ngay") — nút hiện tại trong thiết kế mẫu là placeholder (`callStaff: () => {}`), cần nối thật.
- **Thiết bị nhận thông báo của nhân viên:** cần bắn đồng thời tới 3 loại thiết bị — điện thoại nhân viên phục vụ (di động, đi lại trong nhà hàng), tablet nhân viên (cùng loại thiết bị dùng để order/hỗ trợ khách), và máy tính quầy lễ tân/thu ngân (màn hình cố định, luôn mở). Vì vậy nên xây notification qua kênh dùng chung nhiều nền tảng (web push hoặc app đơn giản chạy được trên cả 3, không phụ thuộc riêng iOS/Android) và kèm âm báo trên máy tính quầy để không bị bỏ sót khi nhân viên không cầm điện thoại/tablet.
- **Responsive:** thiết kế mẫu cố định 1280×832 cho mục đích trình bày; bản thực tế cần chạy tốt trên tablet giữ ngang (khoảng 1024–1366px) tối thiểu; sidebar có thể thu gọn thành thanh ngang cuộn ngang trên màn hình hẹp hơn nếu cần hỗ trợ điện thoại.
- **Đa ngôn ngữ:** thiết kế mẫu có icon cờ ở SOS (đối thủ) hỗ trợ đổi ngôn ngữ — Louis Wine hiện chỉ cần tiếng Việt, nhưng nên tách chuỗi text ra khỏi code (i18n-ready) để dễ mở rộng sau.

## State Management
Trạng thái cần có (phía client, đồng bộ hoá phần dữ liệu menu từ backend):
- `menu`: danh sách danh mục + món, lấy từ API (không hard-code trong code như bản thiết kế mẫu) — cần fetch khi load trang và refetch khi admin cập nhật (poll định kỳ hoặc realtime subscribe).
- `activeCategoryId`: danh mục đang xem.
- `searchText`: từ khoá tìm kiếm.
- `cart`: map `itemId -> { name, unitPrice, qty }`.
- `cartOpen`: boolean, trạng thái drawer giỏ hàng.
- `orderStatus`: trạng thái gửi yêu cầu order (idle / sending / sent / error).
- `tableId`: mã bàn — lấy từ query param của QR code khi khách quét (ví dụ `?table=07`), không hard-code "Bàn 07" như thiết kế mẫu.
- Phía admin: state quản lý danh sách món (CRUD), danh sách đơn hàng/yêu cầu gọi nhân viên theo thời gian thực.

**Data fetching cần có:**
- `GET /api/menu` — lấy toàn bộ danh mục + món (kèm ảnh, giá, trạng thái còn/hết hàng).
- `POST /api/orders` — gửi yêu cầu order (bàn, danh sách món, tổng tiền).
- `POST /api/staff-calls` — gửi yêu cầu gọi nhân viên (bàn, thời điểm).
- Kênh realtime (WebSocket/SSE) để nhân viên nhận `orders` và `staff-calls` ngay lập tức, và để khách nhận cập nhật menu (giá/hết hàng) mà không cần tải lại trang.
- Admin CRUD: `POST/PUT/DELETE /api/categories`, `/api/menu-items` (kèm upload ảnh).

## Design Tokens
Bộ màu (đặt tên biến CSS custom properties trong thiết kế mẫu, giữ nguyên khi tái tạo):

| Vai trò | Biến | Giá trị |
|---|---|---|
| Nền chính | `--color-bg` | `#efe3cf` (parchment ấm) |
| Nền bề mặt/card | `--color-surface`, `--color-neutral-100` | `#e7d7ba` / `#f8f0e2` |
| Chữ chính | `--color-text` | `#2b1a12` (nâu gỗ sồi đậm) |
| Đường viền/chia | `--color-divider` | `#a8823a` (vàng đồng) |
| Accent chính (giá, nút chính) | `--color-accent` | `#7c2128` (burgundy) |
| Accent hover/active | `--color-accent-700` | `#5c1620` |
| Accent phụ (nút tròn +, badge) | `--color-accent-2` | `#b08d3d` (vàng đồng sáng) |
| Sidebar nền | `--color-neutral-800` | `#402f1e` |
| Sidebar chữ | `--color-neutral-100` | `#f8f0e2` |

Ramp đầy đủ (100–900) cho neutral/accent/accent-2 nằm trong file thiết kế (`<style>.lwo-theme{...}</style>`) — copy nguyên khi cần các sắc độ trung gian.

**Typography:** font family `Archivo` cho cả heading và body (`--font-heading`, `--font-body`) — cần import từ Google Fonts hoặc tự host. Cỡ chữ dùng trong thiết kế: 20px (logo), 16px (h3/tổng tiền), 14px (tên món/input), 13px (nút, danh mục), 12px (phụ), 11px (ghi chú nhỏ).

**Spacing/khác:** bo góc = 0 ở toàn bộ thiết kế (không dùng border-radius trừ nút tròn/badge/avatar); viền 1–2px là ngôn ngữ thị giác chính (không dùng shadow để phân vùng).

## Assets
- Toàn bộ ảnh món ăn thật do nhà hàng cung cấp, nằm trong `design/uploads/` (ví dụ: `bo-mot-nang.jfif`, `pate.jfif`, `dui-sau-heo-muoi-iberico-bellota-khong-xuong-nguyen-khoi-1.jpg`, `tom-hum-bong.png`, v.v.) — dùng làm ảnh mẫu ban đầu khi seed dữ liệu; production cần cho phép admin upload/thay ảnh qua trang quản trị (không hard-code path ảnh trong code).
- Nhiều món trong danh sách 91 món (từ file gốc `design/uploads/LouisWineDN_DanhSachMon_TuBanNhap.xlsx`) **chưa có ảnh thật** — khi seed dữ liệu, để trống field ảnh (không tạo ảnh giả), giao diện khách hàng đã được thiết kế để tự ẩn khung ảnh khi món không có ảnh.
- Rượu vang: danh sách hiện chỉ có 4 tên vang mẫu/minh hoạ, giá đánh "Đang cập nhật" — nhà hàng chưa cung cấp danh sách vang thật, cần cập nhật qua trang quản trị khi có dữ liệu.
- Font Archivo: tải từ Google Fonts (`https://fonts.google.com/specimen/Archivo`).

## Screenshots
- `screenshots/01-menu-noi-bat.png` — màn hình chính, danh mục "Món Nổi Bật" đang chọn.
- `screenshots/02-gio-hang.png` — drawer giỏ hàng mở (trạng thái rỗng).

## Files
- `design/Louis Wine Menu Tu Order.dc.html` — thiết kế đầy đủ giao diện khách hàng (HTML/CSS/JS tham khảo, có toàn bộ dữ liệu 16 danh mục món ăn hard-code trong file — cần chuyển thành dữ liệu động từ backend khi tái tạo).
- `design/uploads/` — toàn bộ ảnh món ăn thật đã có, dùng để seed dữ liệu ban đầu.
- `design/LouisWineDN_DanhSachMon_TuBanNhap.xlsx` — file gốc danh sách 91 món + giá do nhà hàng cung cấp, dùng để import dữ liệu ban đầu vào database.
