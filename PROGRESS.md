# Cập nhật tháng 10 — phản hồi giám sát + Book1.xlsx

Trạng thái: **M1 đã code + kiểm chứng, chờ thử preview** (nhánh `feat/m1-stability-tables-qty`). M2–M4 chưa làm.
Quyết định đã chốt: bếp chỉ hiện Đồ ăn · VAT tính trên giá sau chiết khấu · nhập Book1 sau khi sao lưu · giao từng mốc.
Chưa làm / còn mở: khoá chống trùng đơn (idempotency) khi tablet gửi lại; tên phòng chính thức (đang để mã T3-01…). Nguyên tắc: giữ nguyên mọi tính năng hiện có; mọi thay đổi dữ liệu chỉ *thêm cột/thêm giá trị*, ô trống = hành vi cũ.

## Phân tích từng phản hồi (đối chiếu code)

| # | Phản hồi | Nguyên nhân tìm thấy | Mức chắc chắn |
|---|---|---|---|
| 1 | Mất kết nối: tablet không gửi được món, 30–45p/lần, reload TV 10–15s | (a) Phía TV: đã sửa (timeout + báo sau 3 lần lỗi). (b) Phía server: `backend-postgres.ts` tạo `Pool` **không có** `pool.on('error')`, không `idleTimeoutMillis`/`connectionTimeoutMillis`/keepAlive → kết nối nhàn rỗi bị nhà cung cấp DB đóng thì request kế tiếp lỗi/instance sập, khởi động lại ~10–15s. Khớp chu kỳ 30–45p | **Giả thuyết**, chưa có log xác nhận (CLI chỉ stream 5 phút, MCP 403) |
| 2 | Thừa tầng-phòng | `listSwitchOptions()` (`lib/sheets/tableNames.ts`) tự sinh cố định T2–T5 × 15 = 60 bàn. Thực tế: T3=2, T4=8, T5=5 → 15 bàn | Chắc chắn |
| 2b | Không đăng nhập được tài khoản nhân viên khi chuyển bàn | `findUserByUsername` so khớp **phân biệt hoa/thường**; ô tên đăng nhập trong `TableSwitchModal` không tắt tự viết hoa → iPad gõ "Staff" ≠ "staff". API không giới hạn vai trò | Khả năng cao, chưa tái hiện |
| 3 | Đồ ăn/uống/khác đều về chung màn hình bếp | `/api/orders?status=CONFIRMED` cho vai trò KITCHEN trả mọi món, không lọc theo loại | Chắc chắn (cần quyết định cách tách) |
| 4 | Thu ngân: in bill tạm, % chiết khấu, tên khách | Hiện chỉ có "Tiền chiết khấu" (VNĐ); không có in tạm; không có tên khách. **VAT đang tính trên giá trước chiết khấu** (`finalizeTableBill`: total = subtotal − discount + totalVat) | Chắc chắn |
| 5 | Không nhập được số lượng bằng tổng | `CartDrawer` chỉ có nút −/+; API `/api/orders` yêu cầu `qty` số nguyên 1–999 | Chắc chắn |
| 6 | VAT theo danh mục bị đưa về 10% | `Category.vatRate` là VAT duy nhất; món không có VAT riêng (Book1: Nước suối/chanh/trà gừng 8%, còn lại đồ uống 10%) | Chắc chắn |
| 7 | Bill in theo nhóm Đồ Ăn/Đồ Uống/Khác | `BillLine` không có nhóm | Chắc chắn |
| 8 | Gộp danh mục nhỏ → Đồ Ăn/Đồ Uống/Khác | Book1 chỉ có 3 danh mục lớn. Đề xuất: thêm cấp **nhóm** (Ăn/Uống/Khác) cho danh mục; thực đơn khách vẫn duyệt theo danh mục nhỏ hiện có | Đề xuất |

## Book1.xlsx
~197 món, 3 nhóm. Cần lưu ý trước khi nhập: 9 món "Thời giá"/"Đang cập nhật" (không có giá), 1 giá lạ (Cơm Chiên Trái Dứa = 217.999), nhiều món ĐVT `Kg` nhưng API chỉ nhận số lượng nguyên.

## Kế hoạch (mỗi mốc 1 nhánh + preview, không đụng dữ liệu thật trừ mốc 3)
- **M1 — Ổn định & lỗi vặt (không đổi dữ liệu):** gia cố Pool Postgres; danh sách chuyển bàn = 15 bàn thật (T3-01..02, T4-01..08, T5-01..05; tên hiển thị chưa chốt nên giữ mã, đổi tên sau bằng Quản trị); ô nhập số lượng; tên đăng nhập không phân biệt hoa/thường + tắt tự viết hoa.
- **M2 — Thu ngân/hoá đơn:** in bill tạm (không chốt, không số HĐ); chiết khấu theo %; tên khách (thêm cột mới ở sổ hoá đơn + in); bill nhóm theo Đồ Ăn/Đồ Uống/Khác.
- **M3 — Menu/VAT:** thêm VAT riêng cho món (trống = theo danh mục) + nhóm cho danh mục; nhập Book1 (xuất bản sao lưu trước, không xoá món cũ).
- **M4 — Tách màn hình bếp theo nhóm** (theo quyết định).

Rollback: Vercel “Promote/Rollback” về bản trước; cột mới đều tuỳ chọn nên bản code cũ vẫn chạy; nhập Book1 luôn kèm file sao lưu.
