# Cập nhật tháng 10 — phản hồi giám sát + Book1.xlsx

**Cập nhật cuối: M3 đã lên production (13/10); M4 đã code + kiểm thử, chờ duyệt gộp** (nhánh `feat/m4-kitchen-food-only`). M4: mỗi dòng món lưu `section` (cột mới `OrderItems.section`, `CancelledItems.section`; trống = Đồ ăn) → màn bếp, báo huỷ món và thông báo đẩy cho bếp chỉ xét món ăn; "bếp đã xong" (nhân viên, lễ tân, trang theo dõi đơn của khách) chỉ chờ món ăn; đơn chỉ có đồ uống không rung bếp. Đơn đã xác nhận TRƯỚC khi deploy M4 không có `section` nên vẫn hiện cả đồ uống ở bếp cho đến khi thanh toán. Test: `npm run check:kitchen`.
Trạng thái trước đó: **M1, M2 đã lên production (13/10)**. M1 kiểm chứng trên trang thật (15 bàn, giờ 10–22h, điểm 4.3); M2 smoke test (trang công khai 200, API cần đăng nhập 401) nhưng chưa thử được thao tác thu ngân thật vì thiếu tài khoản. **M3 đã code + kiểm thử, chờ duyệt gộp** (nhánh `feat/m3-item-vat-book1`). M4 chưa làm.
M3 gồm: VAT / nhóm / đơn vị riêng từng món (cột mới `MenuItems.vatRate|group|unit`, trống = theo danh mục / "phần"); form sửa món có 3 ô mới; bill in đơn vị thật; công cụ **Quản trị → Nhập Book1** (xem trước → áp dụng → hoàn tác, nhật ký tab `MenuImportLog`; không đổi giá, không xoá món). Dữ liệu: `src/data/book1-menu.json` (207 món, từ Book1.xlsx). Test: `npm run check:bill|check:import|check:import-db`.
Đối chiếu Book1 ↔ menu thật (13/10): 205/207 món trùng tên và giá; chỉ 2 món mới (Nước chanh, Trà gừng). Danh mục lẫn VAT/nhóm: Nước Ngọt (Nước Suối 8%), Charge phí (2 phụ phí rượu 10%), Khác (Cơm trắng, Rau thêm là Đồ ăn).
M2 gồm: bill tạm (phiếu tạm tính), chiết khấu % hoặc đ, VAT tính sau chiết khấu, tên khách (cột mới `Bills.customerName`, `Bills.discountPercent`), bill nhóm Đồ ăn/Đồ uống/Khác (cột mới `Categories.group`, trống = đoán theo tên), cột "Nhóm" ở Quản trị → Danh mục. Test: `npm run check:bill`.
Lưu ý: preview Vercel KHÔNG có biến môi trường (chỉ production có) nên không thử chức năng được trên preview.
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
