import os
import sys
import time
import subprocess

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

from PIL import Image

ADB_PATH = r"D:\tools\platform-tools\adb.exe"
DEVICE = "QV72022C31"
OUTPUT_DIR = r"D:\duanpos-ongchu\anh"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def adb_cmd(args, timeout=15):
    cmd = [ADB_PATH, "-s", DEVICE] + args
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="ignore")
    return res.stdout.strip()

def tap(x, y):
    adb_cmd(["shell", "input", "tap", str(x), str(y)])
    time.sleep(1.0)

def swipe(x1, y1, x2, y2, dur=300):
    adb_cmd(["shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(dur)])
    time.sleep(1.0)

def keyevent(code):
    adb_cmd(["shell", "input", "keyevent", str(code)])
    time.sleep(1.0)

def capture_screen(filename, desc=""):
    save_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(save_path):
        try:
            os.remove(save_path)
        except Exception:
            pass
    adb_cmd(["shell", "rm", "-f", "/sdcard/sony_cap.png"])
    adb_cmd(["shell", "screencap", "-p", "/sdcard/sony_cap.png"])
    adb_cmd(["pull", "/sdcard/sony_cap.png", save_path])
    
    try:
        with Image.open(save_path) as img:
            img.verify()
        with Image.open(save_path) as img:
            w, h = img.size
            max_w = 540
            if w > max_w:
                new_h = int(h * (max_w / w))
                img = img.resize((max_w, new_h), Image.Resampling.LANCZOS)
            img.save(save_path, "PNG", optimize=True)
        size_kb = os.path.getsize(save_path) // 1024
        print(f"[OK] {filename} ({size_kb} KB) - {desc}")
        sys.stdout.flush()
        return True
    except Exception as e:
        print(f"[ERROR] Failed {filename}: {e}")
        sys.stdout.flush()
        return False

def open_drawer():
    tap(90, 130)
    time.sleep(1.2)

def close_drawer():
    tap(950, 1000)
    time.sleep(0.8)

def toggle_dark_mode_in_drawer():
    tap(645, 145)
    time.sleep(1.2)

def main():
    print("=== BẮT ĐẦU CHỤP TOÀN BỘ MÀN HÌNH QUÁN MẪU TRÊN SONY XPERIA ===")
    sys.stdout.flush()
    
    close_drawer()
    time.sleep(1.0)

    # --- 03: POS SƠ ĐỒ BÀN ---
    print("\n--- 1. POS Sơ Đồ Bàn ---")
    tap(140, 2410)
    time.sleep(1.5)
    capture_screen("03_pos_so_do_ban.png", "POS - Sơ đồ bàn ăn (Tất cả khu vực)")

    # Chuyển tab khu vực: Tầng Trệt
    tap(830, 260)
    time.sleep(1.0)
    capture_screen("04_pos_so_do_ban_loc_khu_vuc.png", "POS - Sơ đồ bàn lọc Tầng Trệt")
    tap(530, 260)

    # --- 05: POS GỌI MÓN & THỰC ĐƠN ---
    print("\n--- 2. POS Gọi Món & Thực Đơn ---")
    tap(340, 2410)
    time.sleep(1.5)
    capture_screen("05_pos_thuc_don_mon_an.png", "POS - Thực đơn món ăn & danh mục")

    # Chọn món mở modal
    tap(270, 500)
    time.sleep(1.2)
    capture_screen("06_pos_modal_topping_modifier.png", "POS - Modal chọn Topping & Ghi chú món")
    
    # Đóng modal
    keyevent(4)
    time.sleep(0.8)

    # Chọn 2 món vào giỏ
    tap(270, 500)
    time.sleep(0.8)
    tap(800, 500)
    time.sleep(0.8)

    # Chụp thanh bottom cart bar
    capture_screen("08_pos_bottom_bar_action.png", "POS - Thanh tác vụ Giỏ hàng & Báo Bếp")

    # Mở giỏ hàng
    tap(300, 2260)
    time.sleep(1.2)
    capture_screen("07_pos_gio_hang_co_mon.png", "POS - Giỏ hàng chi tiết món đã chọn")

    # --- 09: THANH TOÁN ---
    print("\n--- 3. Màn hình Thanh Toán ---")
    tap(750, 2260)
    time.sleep(1.8)
    capture_screen("09_thanh_toan_tong_quan.png", "Thanh Toán - Tổng quan hóa đơn & chiết khấu")

    # Tab Tiền Mặt
    tap(180, 480)
    time.sleep(0.8)
    capture_screen("10_thanh_toan_tien_mat_numpad.png", "Thanh Toán - Phím số Numpad & Gợi ý tiền thừa")

    # Tab VietQR
    tap(420, 480)
    time.sleep(1.0)
    capture_screen("11_thanh_toan_vietqr_napas247.png", "Thanh Toán - VietQR Napas247 động")

    keyevent(4) # Back to POS
    time.sleep(1.2)

    # --- 12: BẾP & BAR KDS ---
    print("\n--- 4. Màn hình Bếp & Bar KDS ---")
    tap(540, 2410)
    time.sleep(1.5)
    capture_screen("12_kds_tong_quan.png", "KDS - Màn hình bếp & bar danh sách vé order")

    # Lọc Pha Chế
    tap(450, 260)
    time.sleep(1.0)
    capture_screen("13_kds_bo_loc_tram.png", "KDS - Lọc theo trạm Pha Chế")

    # --- 14: SỔ HÓA ĐƠN ---
    print("\n--- 5. Sổ Hóa Đơn ---")
    tap(740, 2410)
    time.sleep(1.5)
    capture_screen("14_hoa_don_danh_sach.png", "Sổ Hóa Đơn - Danh sách hóa đơn trong ca")

    # Xem chi tiết hóa đơn
    tap(540, 500)
    time.sleep(1.2)
    capture_screen("15_hoa_don_chi_tiet_bill.png", "Sổ Hóa Đơn - Chi tiết hóa đơn & nút In Lại Bill")
    keyevent(4)
    time.sleep(0.8)

    # --- 16: SỔ QUỸ CHI CHỢ 3S ---
    print("\n--- 6. Sổ Quỹ Chi Chợ ---")
    open_drawer()
    tap(420, 1340)
    time.sleep(1.5)
    capture_screen("16_so_quy_tong_quan.png", "Sổ Quỹ - Bảng tổng thu, tổng chi & quỹ tiền mặt")

    # Mở modal chi
    tap(950, 130)
    time.sleep(1.2)
    capture_screen("17_so_quy_tao_phieu_chi_3s.png", "Sổ Quỹ - Modal tạo phiếu chi chợ 3 giây")
    keyevent(4)
    time.sleep(0.8)

    # --- 18: GIAO CA ĐẾM KÉT 30S ---
    print("\n--- 7. Giao Ca Đếm Két ---")
    open_drawer()
    tap(420, 1450)
    time.sleep(1.5)
    capture_screen("18_giao_ca_dem_ket.png", "Giao Ca - Bảng kiểm đếm két tiền theo mệnh giá")
    swipe(500, 1800, 500, 800)
    time.sleep(1.0)
    capture_screen("19_giao_ca_tong_ket_ca.png", "Giao Ca - Tổng kết doanh thu & đối soát chốt ca")
    swipe(500, 800, 500, 1800)
    time.sleep(0.8)

    # --- 20: BÁO CÁO LỢI NHUẬN ---
    print("\n--- 8. Báo Cáo Lợi Nhuận 3 Con Số Vàng ---")
    open_drawer()
    tap(420, 1560)
    time.sleep(1.5)
    capture_screen("20_bao_cao_3_con_so_vang.png", "Báo Cáo - 3 Con Số Vàng (Doanh Thu - Chi Phí - Lợi Nhuận)")

    # Tab Biểu Đồ Doanh Thu
    tap(450, 480)
    time.sleep(1.2)
    capture_screen("21_bao_cao_bieu_do_doanh_thu.png", "Báo Cáo - Biểu đồ cột phân tích doanh thu")

    # Tab Món Bán Chạy
    tap(750, 480)
    time.sleep(1.2)
    capture_screen("22_bao_cao_mon_ban_chay.png", "Báo Cáo - Danh sách Top món bán chạy nhất")

    # --- 23: QUẢN LÝ THỰC ĐƠN ---
    print("\n--- 9. Quản Lý Thực Đơn ---")
    open_drawer()
    tap(420, 1030)
    time.sleep(1.5)
    capture_screen("23_thuc_don_danh_sach.png", "Thực Đơn - Danh sách món ăn kèm giá vốn & giá bán")
    capture_screen("24_thuc_don_bao_het_86.png", "Thực Đơn - Công tắc Báo hết món (86) & Đổi giá")

    # Thêm / Sửa Món
    tap(950, 130)
    time.sleep(1.2)
    capture_screen("25_thuc_don_them_sua_mon.png", "Thực Đơn - Form thêm/sửa món ăn & topping")
    keyevent(4)
    time.sleep(0.8)

    # --- 26: QUẢN LÝ KHÁCH HÀNG ---
    print("\n--- 10. Quản Lý Khách Hàng ---")
    open_drawer()
    tap(420, 1780)
    time.sleep(1.5)
    capture_screen("26_khach_hang_danh_sach.png", "Khách Hàng - Danh sách khách & tích điểm thành viên")

    # Tab Sổ Nợ
    tap(750, 260)
    time.sleep(1.2)
    capture_screen("27_khach_hang_so_no_cong_no.png", "Khách Hàng - Sổ nợ công nợ khách quen")

    # --- 28: KHO HÀNG ---
    print("\n--- 11. Quản Lý Kho Hàng ---")
    open_drawer()
    tap(420, 1140)
    time.sleep(1.5)
    capture_screen("28_kho_hang_ton_kho.png", "Kho Hàng - Tồn kho nguyên vật liệu & cảnh báo sắp hết")

    # Tab Nhập Kho
    tap(750, 260)
    time.sleep(1.2)
    capture_screen("29_kho_hang_nhap_kho.png", "Kho Hàng - Phiếu nhập kho nguyên vật liệu")

    # --- 30: NHÂN SỰ ---
    print("\n--- 12. Quản Lý Nhân Sự ---")
    open_drawer()
    tap(420, 1670)
    time.sleep(1.5)
    capture_screen("30_nhan_su_danh_sach.png", "Nhân Sự - Danh sách nhân viên & phân quyền vai trò")

    # Tab Bảng Lương / Chấm Công
    tap(750, 260)
    time.sleep(1.2)
    capture_screen("31_nhan_su_bang_luong_cham_cong.png", "Nhân Sự - Bảng lương & chấm công ca làm")

    # --- 32: QUẢN LÝ BÀN ---
    print("\n--- 13. Quản Lý Bàn ---")
    open_drawer()
    tap(420, 920)
    time.sleep(1.5)
    capture_screen("32_quan_ly_ban_so_do.png", "Quản Lý Bàn - Sơ đồ thiết lập bàn & khu vực")

    # --- 33: CÀI ĐẶT HỆ THỐNG ---
    print("\n--- 14. Cài Đặt Hệ Thống ---")
    open_drawer()
    tap(420, 1980)
    time.sleep(1.5)
    capture_screen("33_cai_dat_thong_tin_quan.png", "Cài Đặt - Thông tin quán & thương hiệu")

    # Tab VietQR Ngân Hàng
    tap(420, 260)
    time.sleep(1.2)
    capture_screen("34_cai_dat_vietqr_ngan_hang.png", "Cài Đặt - Cấu hình tài khoản nhận VietQR Napas247")

    # Tab Mẫu In Hóa Đơn K80/K58
    tap(750, 260)
    time.sleep(1.2)
    capture_screen("35_cai_dat_mau_in_k80_k58.png", "Cài Đặt - Xem trước mẫu in hóa đơn & máy in LAN 9100")

    # --- 36: MÀN HÌNH KHÁCH CFD ---
    print("\n--- 15. Màn Phụ Khách CFD ---")
    open_drawer()
    tap(420, 2090)
    time.sleep(1.8)
    capture_screen("36_cfd_man_hinh_khach.png", "CFD - Màn hình phụ hướng ra khách hàng kèm mã QR")
    keyevent(4)
    time.sleep(1.2)

    # --- 37: HƯỚNG DẪN SỬ DỤNG ---
    print("\n--- 16. Hướng Dẫn Sử Dụng ---")
    open_drawer()
    tap(150, 2320)
    time.sleep(1.5)
    capture_screen("37_huong_dan_su_dung.png", "Hướng Dẫn - Cẩm nang thao tác 1-chạm & phím tắt")
    keyevent(4)
    time.sleep(1.0)

    # --- 38-40: CHẾ ĐỘ DARK MODE ---
    print("\n--- 17. Chế Độ Dark Mode (Indochine Ban Đêm) ---")
    open_drawer()
    toggle_dark_mode_in_drawer()
    time.sleep(1.2)
    close_drawer()
    
    # Bán Hàng Dark Mode
    tap(140, 2410)
    time.sleep(1.5)
    capture_screen("38_dark_mode_pos.png", "Dark Mode - Giao diện Bán hàng POS màu Cà Phê Rang Đậm")

    # Báo Cáo Dark Mode
    open_drawer()
    tap(420, 1560)
    time.sleep(1.5)
    capture_screen("39_dark_mode_bao_cao.png", "Dark Mode - Báo cáo 3 Con Số Vàng")

    # Bếp KDS Dark Mode
    tap(540, 2410)
    time.sleep(1.5)
    capture_screen("40_dark_mode_kds.png", "Dark Mode - Màn hình Bếp KDS dịu mắt")

    # Trả về Light Mode
    open_drawer()
    toggle_dark_mode_in_drawer()
    time.sleep(1.2)
    close_drawer()

    print("\n=== HOÀN TẤT CHỤP TOÀN BỘ 40+ ẢNH TRÊN SONY XPERIA ===")
    sys.stdout.flush()

if __name__ == "__main__":
    main()
