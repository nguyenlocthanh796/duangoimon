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

def tap(x, y, delay=1.2):
    adb_cmd(["shell", "input", "tap", str(x), str(y)])
    time.sleep(delay)

def swipe(x1, y1, x2, y2, dur=300, delay=1.0):
    adb_cmd(["shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(dur)])
    time.sleep(delay)

def keyevent(code, delay=1.0):
    adb_cmd(["shell", "input", "keyevent", str(code)])
    time.sleep(delay)

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
    tap(90, 130, 1.2)

def close_drawer():
    tap(950, 1000, 0.8)

def toggle_dark_mode():
    open_drawer()
    tap(645, 145, 1.2)
    close_drawer()

def main():
    print("=== TIẾP TỤC CHỤP CÁC MÀN HÌNH CÒN LẠI TRÊN SONY XPERIA ===")
    sys.stdout.flush()

    # Đảm bảo về màn hình chính
    close_drawer()
    time.sleep(1.0)

    # 1. SỔ HÓA ĐƠN CHI TIẾT
    print("\n--- 1. Sổ Hóa Đơn & Chi Tiết Bill ---")
    tap(740, 2410, 1.5) # Tab Sổ Đơn
    capture_screen("14_hoa_don_danh_sach.png", "Sổ Hóa Đơn - Danh sách hóa đơn")
    tap(540, 520, 1.2) # Chạm vào đơn đầu tiên
    capture_screen("15_hoa_don_chi_tiet_bill.png", "Sổ Hóa Đơn - Xem chi tiết hóa đơn & nút In Lại")
    keyevent(4, 1.0) # Back

    # 2. SỔ QUỸ CHI CHỢ 3S
    print("\n--- 2. Sổ Quỹ Chi Chợ ---")
    open_drawer()
    tap(420, 1340, 1.5) # Sổ Quỹ Chi Chợ
    capture_screen("16_so_quy_tong_quan.png", "Sổ Quỹ - Tổng thu, tổng chi & quỹ tiền mặt")
    tap(950, 130, 1.2) # CTA Tạo Phiếu Chi
    capture_screen("17_so_quy_tao_phieu_chi_3s.png", "Sổ Quỹ - Modal tạo phiếu chi chợ 3 giây")
    keyevent(4, 1.0) # Back

    # 3. GIAO CA ĐẾM KÉT 30S
    print("\n--- 3. Giao Ca Đếm Két ---")
    open_drawer()
    tap(420, 1450, 1.5) # Giao Ca
    capture_screen("18_giao_ca_dem_ket.png", "Giao Ca - Bảng kiểm đếm két tiền theo mệnh giá")
    swipe(500, 1800, 500, 800, 300, 1.2) # Cuộn xuống
    capture_screen("19_giao_ca_tong_ket_ca.png", "Giao Ca - Đối soát doanh thu & chốt ca")
    swipe(500, 800, 500, 1800, 300, 1.0)

    # 4. BÁO CÁO LỢI NHUẬN
    print("\n--- 4. Báo Cáo Lợi Nhuận 3 Con Số Vàng ---")
    open_drawer()
    tap(420, 1560, 1.5) # Báo Cáo
    capture_screen("20_bao_cao_3_con_so_vang.png", "Báo Cáo - 3 Con Số Vàng")
    # Cuộn nhẹ xuống để xem biểu đồ
    swipe(500, 1500, 500, 700, 300, 1.2)
    capture_screen("21_bao_cao_bieu_do_doanh_thu.png", "Báo Cáo - Biểu đồ doanh thu & lợi nhuận")
    swipe(500, 1800, 500, 800, 300, 1.2)
    capture_screen("22_bao_cao_mon_ban_chay.png", "Báo Cáo - Top món bán chạy nhất")

    # 5. QUẢN LÝ THỰC ĐƠN
    print("\n--- 5. Quản Lý Thực Đơn ---")
    open_drawer()
    tap(420, 1030, 1.5) # Thực Đơn Món Ăn
    capture_screen("23_thuc_don_danh_sach.png", "Thực Đơn - Danh sách món ăn kèm giá vốn & bán")
    capture_screen("24_thuc_don_bao_het_86.png", "Thực Đơn - Báo hết món 86 & Đổi giá nhanh")
    tap(950, 130, 1.2) # + Thêm món
    capture_screen("25_thuc_don_them_sua_mon.png", "Thực Đơn - Form thêm/sửa món ăn")
    keyevent(4, 1.0)

    # 6. QUẢN LÝ KHÁCH HÀNG & SỔ NỢ
    print("\n--- 6. Quản Lý Khách Hàng & Sổ Nợ ---")
    open_drawer()
    tap(420, 1780, 1.5) # Khách Hàng
    capture_screen("26_khach_hang_danh_sach.png", "Khách Hàng - Danh sách khách hàng & tích điểm")
    tap(750, 260, 1.2) # Tab Sổ Nợ
    capture_screen("27_khach_hang_so_no_cong_no.png", "Khách Hàng - Sổ nợ công nợ khách quen")

    # 7. KHO & HÀNG HÓA
    print("\n--- 7. Quản Lý Kho Hàng ---")
    open_drawer()
    tap(420, 1140, 1.5) # Kho & Hàng Hóa
    capture_screen("28_kho_hang_ton_kho.png", "Kho Hàng - Tồn kho nguyên vật liệu & cảnh báo")
    tap(750, 260, 1.2) # Tab Nhập Kho
    capture_screen("29_kho_hang_nhap_kho.png", "Kho Hàng - Phiếu nhập kho nguyên liệu")

    # 8. NHÂN SỰ & CA LƯƠNG
    print("\n--- 8. Quản Lý Nhân Sự ---")
    open_drawer()
    tap(420, 1670, 1.5) # Nhân Sự
    capture_screen("30_nhan_su_danh_sach.png", "Nhân Sự - Danh sách nhân viên & phân quyền")
    tap(750, 260, 1.2) # Tab Bảng Lương
    capture_screen("31_nhan_su_bang_luong_cham_cong.png", "Nhân Sự - Bảng lương & chấm công ca làm")

    # 9. QUẢN LÝ BÀN
    print("\n--- 9. Quản Lý Bàn ---")
    open_drawer()
    tap(420, 920, 1.5) # Quản Lý Bàn
    capture_screen("32_quan_ly_ban_so_do.png", "Quản Lý Bàn - Thiết lập sơ đồ bàn & khu vực")

    # 10. CÀI ĐẶT HỆ THỐNG
    print("\n--- 10. Cài Đặt Hệ Thống ---")
    open_drawer()
    tap(420, 1980, 1.5) # Cài Đặt
    capture_screen("33_cai_dat_thong_tin_quan.png", "Cài Đặt - Thông tin quán & thương hiệu")
    tap(420, 260, 1.2) # Tab VietQR
    capture_screen("34_cai_dat_vietqr_ngan_hang.png", "Cài Đặt - Cấu hình VietQR Napas247")
    tap(750, 260, 1.2) # Tab Mẫu In Hóa Đơn
    capture_screen("35_cai_dat_mau_in_k80_k58.png", "Cài Đặt - Mẫu in hóa đơn K80/K58 & máy in 9100")

    # 11. MÀN PHỤ KHÁCH CFD
    print("\n--- 11. Màn Phụ Khách CFD ---")
    open_drawer()
    tap(420, 2090, 1.8) # Màn Phụ Khách (CFD)
    capture_screen("36_cfd_man_hinh_khach.png", "CFD - Màn hình phụ hướng khách hàng")
    keyevent(4, 1.2)

    # 12. HƯỚNG DẪN SỬ DỤNG
    print("\n--- 12. Hướng Dẫn Sử Dụng ---")
    open_drawer()
    tap(150, 2320, 1.5) # Nút HD ở footer drawer
    capture_screen("37_huong_dan_su_dung.png", "Hướng Dẫn - Cẩm nang 1-chạm & phím tắt")
    keyevent(4, 1.0)

    # 13. DARK MODE SUITE
    print("\n--- 13. Chế Độ Dark Mode (Indochine Ban Đêm) ---")
    toggle_dark_mode() # Bật Dark Mode
    time.sleep(1.2)
    
    # Bán hàng Dark Mode
    tap(140, 2410, 1.5)
    capture_screen("38_dark_mode_pos.png", "Dark Mode - Bán hàng POS màu Gỗ Gụ & Cà Phê Rang Đậm")

    # Báo Cáo Dark Mode
    open_drawer()
    tap(420, 1560, 1.5)
    capture_screen("39_dark_mode_bao_cao.png", "Dark Mode - Báo cáo 3 Con Số Vàng")

    # Bếp KDS Dark Mode
    tap(540, 2410, 1.5)
    capture_screen("40_dark_mode_kds.png", "Dark Mode - Bếp / Bar KDS ban đêm")

    # Trả về Light Mode
    toggle_dark_mode()
    time.sleep(1.0)

    print("\n=== HOÀN TẤT CHỤP TOÀN BỘ 40+ ẢNH TRÊN SONY XPERIA ===")
    sys.stdout.flush()

if __name__ == "__main__":
    main()
