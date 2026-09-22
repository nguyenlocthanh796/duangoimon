# 📱 KIỂM THỬ THIẾT BỊ ANDROID THỰC TẾ QUA ADB MCP SERVER

Tập lệnh điều khiển: `scripts/android_adb_mcp.py`

---

## 1. TỔNG QUAN CÔNG CỤ ADB MCP SERVER
Công cụ `android_adb_mcp.py` là một Model Context Protocol (MCP) server chuẩn JSON-RPC 2.0 cho phép AI Agent giao tiếp trực tiếp với điện thoại Android hoặc Tablet qua giao thức Android Debug Bridge (ADB).

---

## 2. CÁC CÔNG CỤ MCP HỖ TRỢ

| Tên Công Cụ MCP | Tham Số | Chức Năng |
| :--- | :--- | :--- |
| `adb_list_devices` | Không có | Liệt kê toàn bộ thiết bị Android đang kết nối USB hoặc WiFi |
| `adb_dump_ui` | `device` (tùy chọn) | **[ƯU TIÊN 1]** Trích xuất nhanh cây phân cấp UI và nhãn nút bấm/text dạng cấu trúc |
| `adb_screenshot` | `device`, `save_path` | Chụp ảnh màn hình, tự động kiểm tra toàn vẹn và nén tối ưu (chống lỗi HTTP 400) |
| `adb_tap` | `x`, `y`, `device` | Mô phỏng chạm ngón tay vào tọa độ (X, Y) |
| `adb_swipe` | `x1`, `y1`, `x2`, `y2`, `duration_ms`, `device` | Mô phỏng vuốt màn hình (cuộn danh sách món, kéo giỏ hàng) |
| `adb_input_text` | `text`, `device` | Nhập văn bản vào ô tìm kiếm hoặc form nhập liệu |
| `adb_keyevent` | `keycode`, `device` | Gửi phím cứng (BACK: 4, HOME: 3, ENTER: 66) |
| `adb_reverse_ports`| `device` | Forward cổng mạng `8085` và `8080` từ máy tính sang điện thoại Android |
| `adb_open_url` | `url`, `package_name`, `device` | Mở trực tiếp đường link POS trên Expo Go hoặc Chrome điện thoại |

---

## 3. CÁCH SỬ DỤNG TRONG QUY TRÌNH KIỂM THỬ E2E & PHÒNG TRÁNH LỖI HTTP 400
1. Cắm điện thoại Android vào cổng USB của máy tính và bật **USB Debugging** (hoặc chạy Android Emulator).
2. Chạy lệnh: `adb devices` để xác nhận thiết bị đã sẵn sàng.
3. Chạy lệnh reverse port: `adb reverse tcp:8085 tcp:8085` và `adb reverse tcp:8080 tcp:8080`.
4. Mở app POS trên điện thoại qua URL: `http://localhost:8085`.
5. **Quy tắc Vàng Kiểm Thử Giao Diện (Zero HTTP 400 Invariant)**:
   - **Ưu tiên hàng đầu**: Sử dụng `adb_dump_ui` để phân tích layout, nút bấm và trạng thái màn hình thay vì chụp ảnh. `adb_dump_ui` nhanh gấp 10 lần, 0ms lag, không tốn token và an toàn 100%.
   - **Khi cần chụp ảnh**: Dùng `adb_screenshot`. Server MCP đã tích hợp tự động kiểm tra toàn vẹn (integrity validation) và nén chiều rộng về 540px (~30-50KB) để đảm bảo không bao giờ bị lỗi corrupted PNG hay tràn payload `INVALID_ARGUMENT (code 400)`.
   - **Tuyệt đối cấm**: Không gọi `view_file` lên các file ảnh PNG raw ADB chưa qua tối ưu hoặc từ các đường dẫn rác/hỏng.
