# Theo dõi giá gà lông

Trang: https://nguyenvanhoa1912-lasotuvi.github.io/lasotuvi/gia-ga-long/

## Cơ chế quét và cập nhật
- **Tự động (GitHub Actions)**: workflow `.github/workflows/gia-ga-long-scan.yml` chạy lúc 06:17 mỗi ngày và thêm 17:17 thứ Ba, thứ Tư (giờ Việt Nam). Script `scripts/scan.js` đọc nguồn, rồi ghi `data.json` và commit lại.
- **Chạy tay**: vào tab *Actions* → *Quét giá gà lông* → *Run workflow*.
- **Quét ngay trên trang**: nút "⟳ Quét ngay" quét từ trình duyệt qua proxy công cộng. Kết quả chỉ lưu trên máy đó cho đến lần quét tự động kế tiếp.

## Nguồn
| Nguồn | Dùng cho |
|---|---|
| Tạp chí Chăn nuôi VN – bảng giá tại trại (nguoichannuoi.vn, mục Giá cả) | Chuỗi chính (giá ngày gà chuyên thịt, gà thịt lông màu, 3 miền) |
| GreenFeed – bảng giá thị trường (gà màu, gà trắng; bình quân vùng) | So sánh |
| Google News RSS "giá gà" | Tin tức |
| Các link trong `sources.json` → `extra` | Bổ sung |

## Thêm nguồn cố định
Sửa `sources.json`, thêm vào mảng `extra`:
```json
{ "name": "Tên nguồn", "url": "https://..." }
```
Hệ thống tự nhận dạng loại link: bảng giá tại trại nguoichannuoi.vn đưa vào chuỗi chính; bảng GreenFeed đưa vào phần so sánh; link RSS đưa vào tin tức; trang bất kỳ thì trích câu có giá gà (đ/kg) để tham khảo. Sau khi commit `sources.json`, workflow tự chạy lại.

## Kiểm tra số liệu
Số liệu bị đánh dấu "cần xác minh" khi lệch hơn 25% so với kỳ trước, hoặc lệch hơn 35% so với GreenFeed trong vòng 6 ngày. Các tháng thiếu số liệu không được ước tính.
