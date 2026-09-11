# Louis Wine — Menu Tự Order

Ứng dụng order tại bàn cho Louis Wine (hầm rượu vang, Đà Nẵng): khách quét QR ở
bàn → xem menu → thêm vào giỏ → gửi yêu cầu tới nhân viên theo thời gian thực.
Có trang quản trị để tự cập nhật danh mục / món / giá / ảnh / trạng thái còn-hết
hàng mà không cần sửa code.

Xây dựng từ bản thiết kế `Louis Wine Menu Tu Order.dc.html` (Claude Design,
theme "Modernist" tô lại màu burgundy / vàng đồng / nâu gỗ sồi) và dữ liệu
91 món từ file Excel gốc của nhà hàng.

## Stack

- **Next.js 15** (App Router) + **React 19** + TypeScript — một service duy nhất
  (frontend khách + trang quản trị + API đều chạy chung).
- **PostgreSQL** + **Prisma** — lưu danh mục, món ăn, đơn hàng, yêu cầu gọi nhân viên, tài khoản.
- **WebSocket** (`ws`, gắn vào server HTTP tuỳ biến `server.ts`) — đẩy realtime
  đơn hàng mới / gọi nhân viên tới màn hình nhân viên (điện thoại, tablet, máy
  tính quầy — chỉ cần mở trình duyệt, không cần cài app riêng cho từng nền tảng).
- Cookie session (JWT ký bằng `jose`) cho đăng nhập quản trị / nhân viên.

## Chạy ở máy local

### 1. Cài đặt

```bash
npm install
```

Cần có PostgreSQL đang chạy. Sửa `DATABASE_URL` trong `.env` nếu khác mặc định
(mặc định dev: `postgresql://postgres:louiswine_dev@localhost:5432/louiswine`).

### 2. Tạo schema + import dữ liệu mẫu

```bash
npx prisma migrate dev
npm run seed
```

Lệnh seed sẽ tạo:
- 15 danh mục món ăn thật (91 món, đúng theo file Excel gốc) + danh mục "Rượu Vang Đỏ" (4 vang mẫu, giá "Đang cập nhật" — nhà hàng chưa cung cấp danh sách vang thật, cập nhật qua trang quản trị khi có).
- 20 món được đánh dấu "Món Nổi Bật" và 25 món có ảnh thật (từ `public/uploads/`, các món còn lại chưa có ảnh sẽ tự ẩn khung ảnh ở giao diện khách — đúng theo thiết kế).
- 2 tài khoản đăng nhập:
  - `admin` / `louiswine-admin` — quản trị đầy đủ (danh mục, món, ảnh, giá).
  - `staff` / `louiswine-staff` — chỉ xem/xác nhận đơn & gọi nhân viên.

  Đổi mật khẩu seed bằng biến môi trường `SEED_ADMIN_PASSWORD` /
  `SEED_STAFF_PASSWORD` trước khi chạy `npm run seed` nếu muốn. **Đổi mật khẩu
  mặc định trước khi dùng thật.**

### 3. Chạy dev server

```bash
npm run dev
```

Mở:
- `http://localhost:3000/order?table=07` — menu khách tại bàn số 07 (số bàn lấy
  từ query param `table`, thực tế sẽ do mã QR ở từng bàn quy định — mỗi bàn in
  một mã QR trỏ tới `/order?table=<số bàn>`).
- `http://localhost:3000/staff` — màn hình nhân viên (đăng nhập `staff` hoặc `admin`).
- `http://localhost:3000/admin` — trang quản trị (đăng nhập `admin`).
- `http://localhost:3000/` — trang chủ có link nhanh tới cả 3 màn trên.

## Cấu trúc

```
server.ts                 Custom Next.js server, gắn WebSocket vào cùng cổng HTTP
prisma/schema.prisma       Category, MenuItem, Order, OrderItem, StaffCall, User
prisma/seed.ts             Seed 91 món thật + 4 vang mẫu + tài khoản mặc định
src/app/
  order/                   Màn hình khách (kiosk, full-viewport)
  staff/                   Màn hình nhân viên (realtime) + /staff/login
  admin/(protected)/       Quản lý danh mục + món (yêu cầu đăng nhập ADMIN)
  admin/login/
  api/                     Route handlers (REST + auth)
src/components/            React components theo từng khu vực (order/staff/admin)
src/lib/                   db (Prisma client), auth, ws (bus realtime), validation, format...
public/uploads/            Ảnh món ăn thật (seed) + public/uploads/admin/ (ảnh admin tải lên)
```

## API chính

| Method | Path | Ai gọi | Việc gì |
|---|---|---|---|
| GET | `/api/menu` | công khai | Danh mục + món **đang bán** cho màn hình khách |
| POST | `/api/orders` | công khai (mỗi bàn) | Gửi giỏ hàng — server tự tính lại giá từ DB, không tin giá từ client |
| GET | `/api/orders` | nhân viên/admin | Danh sách đơn (lọc theo `?status=`) |
| PATCH | `/api/orders/:id` | nhân viên/admin | Xác nhận (`CONFIRMED`) hoặc huỷ (`CANCELLED`) đơn |
| POST | `/api/staff-calls` | công khai | Khách bấm "Gọi nhân viên" |
| PATCH | `/api/staff-calls/:id` | nhân viên/admin | Đánh dấu đã xử lý |
| GET/POST | `/api/categories` | admin | Danh mục |
| PUT/DELETE | `/api/categories/:id` | admin | Sửa tên/thứ tự, xoá (chỉ khi không còn món) |
| GET/POST | `/api/menu-items` | admin | Món ăn |
| PUT/DELETE | `/api/menu-items/:id` | admin | Sửa/xoá món (giá cố định hoặc "Thời giá"/"Đang cập nhật", ảnh, còn/hết hàng, nổi bật) |
| POST | `/api/upload` | admin | Tải ảnh món (JPEG/PNG/WEBP/GIF, tối đa 8MB) |
| POST | `/api/auth/login`, `/logout` | — | Đăng nhập/đăng xuất |

Mọi thay đổi từ trang quản trị (`menu:updated`) và mọi đơn hàng/gọi nhân viên
mới đều được đẩy qua WebSocket (`ws://<host>/ws`) — màn hình khách tự refetch
menu khi admin đổi giá/ảnh/trạng thái, màn hình nhân viên nhận đơn + phát âm
báo ngay lập tức, không cần tải lại trang.

## Vận hành thực tế — những điểm cần lưu ý

- **Mã bàn**: in một mã QR cho mỗi bàn trỏ tới
  `https://<domain-thật>/order?table=<số bàn>`. Không hard-code số bàn trong code.
- **Món "Thời giá" / "Đang cập nhật"** (hải sản theo cân, rượu vang chưa có giá):
  không có nút "+" ở menu khách — khách phải bấm "Gọi nhân viên" để đặt món này.
  Cập nhật giá thật cho rượu vang qua Quản trị → Món ăn khi nhà hàng có danh sách vang chính thức.
- **Hết hàng**: bỏ tick "Đang bán" trong Quản trị → món biến mất khỏi menu khách
  ngay lập tức (không cần deploy lại).
- **Thiết bị nhân viên**: `/staff` là một trang web thường — mở được trên điện
  thoại, tablet, hoặc máy tính quầy lễ tân, không cần cài app riêng. Nên **giữ
  tab luôn mở** trên các thiết bị này để nhận âm báo + realtime; máy tính quầy
  nên bật loa ngoài vì đây là thiết bị "luôn trực" theo yêu cầu vận hành.
- **Bảo mật**: đổi `SESSION_SECRET` trong `.env` và mật khẩu admin/staff mặc
  định trước khi dùng thật; hiện chưa cấu hình HTTPS/deploy (nằm ngoài phạm vi
  của lần triển khai dev này).

## Việc còn lại trước khi lên môi trường thật (ngoài phạm vi lần này)

- Deploy thực tế (Docker/hosting), HTTPS, biến môi trường production, backup DB.
- Danh sách rượu vang thật (hiện đang là placeholder "Đang cập nhật").
- Rà soát lại các dòng dữ liệu Excel gốc có ghi chú "CẦN XÁC NHẬN" (ví dụ
  "Phô mai tổng hợp" có thể trùng "Phô mai tổng hợp đặc biệt", "Bào Ngư hấp
  miến tỏi" thiếu giá gốc) — sửa trực tiếp qua trang quản trị khi bếp xác nhận lại.
