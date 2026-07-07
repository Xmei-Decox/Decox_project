# QS Web App – Báo giá / Khái toán (Decox)

Web app Apps Script chạy ngay trên Google Sheet, giao diện kiểu hệ thống QS bóc tách khối lượng.

## Nội dung
- `Code.gs` – toàn bộ logic phía server (đọc sản phẩm, tạo dự án, dòng báo giá, khái toán).
- `index.html` – giao diện web 3 tab: **Dự án · Danh sách sản phẩm · Báo giá**.

## Cấu trúc dữ liệu (sheet)
| Sheet | Vai trò |
|---|---|
| `DANH SÁCH SẢN PHẨM` | Danh mục gốc. Dùng cột **`GIÁ BÁN LẺ`** làm đơn giá báo giá. Code đọc theo **tên cột** nên không sợ đổi thứ tự. |
| `Dự án` | Mỗi dòng 1 dự án. Cột: `Mã DA \| Tên dự án \| Khách hàng \| Địa chỉ \| SĐT \| Trạng thái \| VAT (%) \| Tiến độ (%) \| Ghi chú \| Ngày tạo \| Cập nhật`. App tự điền tiêu đề. |
| `Chi tiết báo giá` | Mỗi dòng 1 hạng mục, gắn `Mã DA`. Cột: `Line ID \| Mã DA \| STT \| Nhóm \| Loại \| Mã SP \| Tên \| Thương hiệu \| Mô tả \| Kích thước \| Hình ảnh \| ĐVT \| Số lượng \| Đơn giá vốn \| % Lợi nhuận \| Đơn giá bán \| Thành tiền vốn \| Thành tiền bán`. |

**Giá:** Đơn giá vốn = cột `ĐƠN GIÁ GỐC`, Đơn giá bán = cột `GIÁ BÁN LẺ`; % Lợi nhuận tự tính = (bán − vốn)/vốn.

## Các trang (liên kết theo dự án đang chọn)
1. **Bảng điều khiển** – 5 thẻ tổng hợp + giá trị theo nhóm.
2. **Thông tin dự án** – danh sách dự án, tạo/sửa/xoá, chọn dự án đang bóc, tiến độ.
3. **Bóc tách** – thêm hạng mục từ danh mục (tìm kiếm), sửa nhóm/tên/ĐVT/số lượng.
4. **Chi phí** – nhập đơn giá vốn + % LN → tự ra đơn giá bán, thành tiền vốn/bán.
5. **Xuất báo giá** – bật/tắt cột, xem trước, tổng khái toán + VAT.

## ✅ Đã deploy (live)
- **Web app URL:** https://script.google.com/macros/s/AKfycbwERwkQ1V2v8o0BOw4CzbkV7tJIV896JHyvG7EIH-KAmrWadBf9mFZub6meUFM2zRmF/exec
- Script gắn (bound) vào Sheet `1DDbw4W8v5UelNOQnxjWYJwzaQY7r2U7E44l_pwPlqRo`, đăng nhập clasp: `maitran@decoxdesign.com`.
- Script ID: `1C68yD1ofvAFgxFeh2RBrbXdnntmUj2w9BF6IRcN1_0cacn0j4IhtuaDI`

### Cập nhật code về sau (từ thư mục này)
```bash
npx clasp push -f                              # đẩy code mới lên
npx clasp redeploy AKfycbwERwkQ1V2v8o0BOw4CzbkV7tJIV896JHyvG7EIH-KAmrWadBf9mFZub6meUFM2zRmF   # cập nhật bản web app đang chạy
```

## Cài đặt thủ công (nếu làm lại từ đầu)
1. Mở Google Sheet → **Extensions ▸ Apps Script**.
2. Tạo file **`Code.gs`** → dán nội dung `Code.gs`.
3. Bấm **+ ▸ HTML** đặt tên **`index`** → dán nội dung `index.html`.
4. Trong danh mục sản phẩm, đảm bảo có **cột tên `ĐƠN GIÁ`**.
5. Chọn hàm `setup` ở thanh trên → **Run** (cấp quyền lần đầu). Sheet `DU_AN`, `BAO_GIA_LINES` sẽ được tạo.
6. **Deploy ▸ New deployment ▸ Web app**
   - Execute as: *Me*
   - Who has access: *Anyone* (hoặc *Anyone with Google account*)
   - Bấm **Deploy** → copy **Web app URL** để dùng.

## Cách dùng
- **Tab Dự án:** bấm *＋ Tạo dự án* → nhập tên/khách hàng/VAT → *Mở báo giá*.
- **Tab Danh sách sản phẩm:** tìm kiếm, bấm *＋ Thêm* để đưa sản phẩm vào báo giá của dự án đang chọn.
- **Tab Báo giá:** bấm các **chip cột** để bật/tắt cột hiển thị; sửa *Số lượng* / *Đơn giá* ngay trên bảng; dòng **KHÁI TOÁN** = Σ(SL × đơn giá) + VAT tự cập nhật.

## Mở rộng gợi ý (giai đoạn sau)
- Nút Xuất PDF / Xuất Excel báo giá.
- Cột custom + công thức (giống hình mẫu QS).
- Gộp theo Hạng mục / Khu vực, sắp xếp kéo-thả.
- Ảnh trong ô (dùng link Drive → `driveThumb`).
