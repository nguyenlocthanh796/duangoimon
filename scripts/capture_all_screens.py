import os
import sys
import time
import subprocess
import re
import xml.etree.ElementTree as ET

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ADB = r"D:\tools\platform-tools\adb.exe"
DEVICE = "QV72022C31"
OUTPUT_DIR = r"D:\duanpos-ongchu\anh"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_adb(args):
    cmd = [ADB, "-s", DEVICE] + args
    return subprocess.run(cmd, capture_output=True, text=True, timeout=15)

def tap(x, y, delay=1.2):
    run_adb(["shell", "input", "tap", str(int(x)), str(int(y))])
    time.sleep(delay)

def swipe(x1, y1, x2, y2, duration=300, delay=1.0):
    run_adb(["shell", "input", "swipe", str(int(x1)), str(int(y1)), str(int(x2)), str(int(y2)), str(int(duration))])
    time.sleep(delay)

def back(delay=1.0):
    run_adb(["shell", "input", "keyevent", "4"])
    time.sleep(delay)

def capture(filename, description=""):
    filepath = os.path.join(OUTPUT_DIR, filename)
    cmd = [ADB, "-s", DEVICE, "exec-out", "screencap", "-p"]
    with open(filepath, "wb") as f:
        subprocess.run(cmd, stdout=f, timeout=15)
    size_kb = os.path.getsize(filepath) // 1024
    print(f"[CAPTURE] [{filename}] ({size_kb} KB) - {description}")
    return filepath

def dump_ui():
    run_adb(["shell", "uiautomator", "dump", "/sdcard/window_dump.xml"])
    out = run_adb(["shell", "cat", "/sdcard/window_dump.xml"]).stdout
    nodes = []
    try:
        root = ET.fromstring(out)
        for node in root.iter("node"):
            t = node.attrib.get("text", "")
            c = node.attrib.get("content-desc", "")
            b = node.attrib.get("bounds", "")
            if b:
                m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", b)
                if m:
                    l, top, r, bot = map(int, m.groups())
                    cx = (l + r) // 2
                    cy = (top + bot) // 2
                    nodes.append({"text": t, "desc": c, "center": (cx, cy), "bounds": (l, top, r, bot)})
    except Exception:
        pass
    return nodes

def find_node(text_match=None, desc_match=None):
    nodes = dump_ui()
    for n in nodes:
        if text_match and text_match.lower() in n["text"].lower():
            return n
        if desc_match and desc_match.lower() in n["desc"].lower():
            return n
    return None

def find_tap(text_match=None, desc_match=None, fallback=None, delay=1.2):
    n = find_node(text_match, desc_match)
    if n:
        tap(n["center"][0], n["center"][1], delay=delay)
        return True
    elif fallback:
        tap(fallback[0], fallback[1], delay=delay)
        return True
    return False

def open_sidebar():
    tap(90, 110, delay=1.5)

def close_sidebar():
    tap(950, 110, delay=1.0)

print(f"Bắt đầu chụp toàn bộ màn hình từ thiết bị Sony ({DEVICE})...")
print(f"Thư mục lưu trữ: {OUTPUT_DIR}\n")

# --- 1. SIDEBAR & GLOBAL OVERLAYS ---
print("=== 1. SIDEBAR & GLOBAL OVERLAYS ===")
open_sidebar()
capture("01_sidebar_drawer.png", "Sidebar Drawer Menu Đầy Đủ")

# Tap Role Switcher
tap(140, 220, delay=1.2)
capture("02_role_switcher_modal.png", "Popup Chuyển Đổi Vai Trò Người Dùng")
back()

open_sidebar()
# Tap Branch Switcher
tap(400, 220, delay=1.2)
capture("03_branch_switcher_modal.png", "Popup Chọn Chi Nhánh Quán")
back()

# --- 2. SƠ ĐỒ BÀN & POS BÁN HÀNG ---
print("\n=== 2. SƠ ĐỒ BÀN & POS BÁN HÀNG ===")
open_sidebar()
tap(400, 400, delay=1.5)
capture("08_pos_so_do_ban_all.png", "Sơ Đồ Bàn - Tất Cả")

# Tap Khu Vực Tầng Trệt chip
find_tap(text_match="Tầng Trệt", fallback=(400, 310))
capture("09_pos_so_do_ban_tang_tret.png", "Sơ Đồ Bàn - Tầng Trệt")

# Tap Lầu 1 chip
find_tap(text_match="Lầu 1", fallback=(680, 310))
capture("10_pos_so_do_ban_lau_1.png", "Sơ Đồ Bàn - Lầu 1")

# Tap Sân Vườn chip
find_tap(text_match="Sân Vườn", fallback=(900, 310))
capture("11_pos_so_do_ban_san_vuon.png", "Sơ Đồ Bàn - Sân Vườn")

# Tap Tất Cả chip back
find_tap(text_match="Tất Cả", fallback=(160, 310))

# Tap table card (Bàn 01)
tap(300, 600, delay=1.5)
capture("13_pos_table_actions_modal.png", "Popup Thao Tác Bàn")

# Tap Chuyển Bàn if available
if find_tap(text_match="Chuyển Bàn", fallback=(300, 1600)):
    capture("14_pos_table_transfer_picker.png", "Modal Chọn Bàn Đích")
    back()

# Tap Ghi Chú Bàn if available
if find_tap(text_match="Ghi Chú", fallback=(300, 1750)):
    capture("15_pos_table_guest_note_modal.png", "Modal Ghi Chú Bàn Ăn")
    back()

back()

# --- 3. THỰC ĐƠN GỌI MÓN & MODIFIERS ---
print("\n=== 3. THỰC ĐƠN GỌI MÓN & MODIFIERS ===")
# Tap Tab Gọi Món on BottomNavBar
tap(325, 2430, delay=1.5)
capture("16_pos_goi_mon_tat_ca.png", "Thực Đơn Gọi Món - Tất Cả")

# Tap category chips
find_tap(text_match="Cà Phê", fallback=(360, 310))
capture("17_pos_goi_mon_ca_phe.png", "Thực Đơn - Nhóm Cà Phê")

find_tap(text_match="Trà Sữa", fallback=(560, 310))
capture("18_pos_goi_mon_tra_sua.png", "Thực Đơn - Nhóm Trà Sữa")

find_tap(text_match="Bánh Ngọt", fallback=(780, 310))
capture("19_pos_goi_mon_banh_ngot.png", "Thực Đơn - Nhóm Bánh Ngọt")

# Tap OmniSearch
tap(720, 110, delay=1.2)
capture("20_pos_omni_search_active.png", "Thanh Tìm Kiếm Nhanh OmniSearch")
back()

# Tap a product card to open modifier sheet
find_tap(text_match="Trà Sữa", fallback=(300, 650), delay=1.5)
capture("21_pos_item_modifier_sheet.png", "Bảng Chọn Size & Topping Món")

# Select modifier options
find_tap(text_match="Size L", fallback=(650, 950))
find_tap(text_match="Trân Châu", fallback=(300, 1400))
capture("22_pos_item_modifier_configured.png", "Topping & Tùy Biến Đã Cấu Hình")

# Tap Add to cart
find_tap(text_match="Thêm", fallback=(540, 2300), delay=1.5)

# --- 4. GIỎ HÀNG POS & POPUPS ---
print("\n=== 4. GIỎ HÀNG POS & POPUPS ===")
capture("23_pos_cart_mobile_bar.png", "Thanh MobileCartBar Nổi Ở Đáy")

# Tap MobileCartBar to open fullscreen cart
tap(540, 2320, delay=1.5)
capture("24_pos_fullscreen_cart.png", "Toàn Màn Hình Giỏ Hàng Đơn Món")

# Tap Chiết Khấu / % Giảm
find_tap(text_match="Chiết Khấu", fallback=(220, 1950))
capture("25_pos_cart_discount_modal.png", "Modal Chiết Khấu Giảm Giá")
back()

# Tap + Món Khác
find_tap(text_match="Món Khác", fallback=(450, 1950))
capture("26_pos_cart_custom_item_modal.png", "Modal Thêm Món Ngoài Thực Đơn")
back()

# Tap In Thử Bill / Xem Bill
find_tap(text_match="Xem Bill", fallback=(700, 1950))
capture("28_pos_cart_receipt_preview.png", "Modal Xem Trước & In Thử Hóa Đơn")
back()

# --- 5. THANH TOÁN ---
print("\n=== 5. THANH TOÁN ===")
find_tap(text_match="Tính Tiền", fallback=(540, 2400), delay=2.0)
capture("30_thanh_toan_main_tien_mat.png", "Màn Hình Thanh Toán - Tab Tiền Mặt")

# Tap VietQR tab
find_tap(text_match="VietQR", fallback=(400, 310))
capture("31_thanh_toan_vietqr.png", "Thanh Toán Chuyển Khoản VietQR Động")

# Tap Thẻ tab
find_tap(text_match="Thẻ", fallback=(650, 310))
capture("32_thanh_toan_the_pos.png", "Thanh Toán Quẹt Thẻ POS")

# Tap Hỗn Hợp tab
find_tap(text_match="Hỗn Hợp", fallback=(900, 310))
capture("33_thanh_toan_hon_hop_mixed.png", "Thanh Toán Hỗn Hợp Multi-pay")

# Tap Khách Hàng CRM
find_tap(text_match="Khách Hàng", fallback=(200, 450))
capture("34_thanh_toan_crm_modal.png", "Modal Chọn Khách Hàng / Ghi Nợ CRM")
back()

# Tap Hóa Đơn Điện Tử
find_tap(text_match="HĐĐT", fallback=(500, 450))
capture("35_thanh_toan_einvoice_modal.png", "Modal Xuất Hóa Đơn Điện Tử MTT")
back()

# Tap Ghi Chú Đơn
find_tap(text_match="Ghi Chú", fallback=(800, 450))
capture("36_thanh_toan_order_note_modal.png", "Modal Ghi Chú Đơn Hàng")
back()

# Back to main POS
back()
back()

# --- 6. KDS BẾP / BAR ---
print("\n=== 6. KDS BẾP / BAR ===")
open_sidebar()
tap(400, 480, delay=1.5)
capture("38_kds_tat_ca_ve.png", "KDS - Tất Cả Vé Bếp")

find_tap(text_match="Đang Nấu", fallback=(450, 310))
capture("39_kds_tab_dang_nau.png", "KDS - Tab Đang Chế Biến")

find_tap(text_match="Sẵn Sàng", fallback=(750, 310))
capture("40_kds_tab_san_sang.png", "KDS - Tab Sẵn Sàng Bưng Bàn")

find_tap(text_match="Bar", fallback=(350, 400))
capture("41_kds_filter_bar.png", "KDS - Trạm Pha Chế Bar")

find_tap(text_match="Bếp", fallback=(550, 400))
capture("42_kds_filter_bep.png", "KDS - Trạm Bếp Nấu")

tap(920, 110, delay=1.2)
capture("43_kds_history_recall_modal.png", "KDS - Modal Phục Hồi Vé Bếp")
back()

# --- 7. SỔ HÓA ĐƠN ---
print("\n=== 7. SỔ HÓA ĐƠN ===")
open_sidebar()
tap(400, 570, delay=1.5)
capture("44_hoa_don_danh_sach.png", "Sổ Hóa Đơn - Toàn Bộ Đơn Bán")

find_tap(text_match="Đã Thu", fallback=(450, 310))
capture("45_hoa_don_filter_da_thanh_toan.png", "Sổ Hóa Đơn - Đã Thanh Toán")

find_tap(text_match="Đã Hủy", fallback=(700, 310))
capture("46_hoa_don_filter_da_huy.png", "Sổ Hóa Đơn - Đã Hủy")

find_tap(text_match="Ghi Nợ", fallback=(900, 310))
capture("47_hoa_don_filter_ghi_no.png", "Sổ Hóa Đơn - Ghi Nợ")

# Tap an invoice item
tap(540, 600, delay=1.5)
capture("48_hoa_don_detail_modal.png", "Modal Chi Tiết Hóa Đơn")

if find_tap(text_match="Hủy Đơn", fallback=(540, 2350)):
    capture("49_hoa_don_void_reason_modal.png", "Modal Chọn Lý Do Hủy Hóa Đơn")
    back()
back()

# --- 8. QUẢN LÝ BÀN ĂN ---
print("\n=== 8. QUẢN LÝ BÀN ĂN ===")
open_sidebar()
tap(400, 720, delay=1.5)
capture("50_quan_ly_ban_danh_sach.png", "Quản Lý Bàn - Danh Sách Bàn")

find_tap(text_match="Khu Vực", fallback=(650, 200))
capture("51_quan_ly_ban_tab_khu_vuc.png", "Quản Lý Bàn - Tab Khu Vực")

tap(920, 110, delay=1.2)
capture("53_quan_ly_ban_modal_them_khu_vuc.png", "Modal Thêm Khu Vực Mới")
back()

find_tap(text_match="Danh Sách Bàn", fallback=(250, 200))
tap(920, 110, delay=1.2)
capture("52_quan_ly_ban_modal_them_ban.png", "Modal Thêm Bàn Mới")
back()

# --- 9. QUẢN LÝ THỰC ĐƠN ---
print("\n=== 9. QUẢN LÝ THỰC ĐƠN ===")
open_sidebar()
tap(400, 810, delay=1.5)
capture("54_thuc_don_danh_sach_mon.png", "Thực Đơn - Danh Sách Món Ăn")

tap(920, 110, delay=1.2)
capture("55_thuc_don_modal_them_mon.png", "Modal Thêm Món Ăn Mới")
back()

find_tap(text_match="Nhóm Món", fallback=(500, 200))
capture("56_thuc_don_tab_nhom_mon.png", "Thực Đơn - Tab Nhóm Món")
tap(920, 110, delay=1.2)
capture("57_thuc_don_modal_them_nhom.png", "Modal Thêm Nhóm Món Mới")
back()

find_tap(text_match="Topping", fallback=(850, 200))
capture("58_thuc_don_tab_topping.png", "Thực Đơn - Tab Quản Lý Topping")
tap(920, 110, delay=1.2)
capture("59_thuc_don_modal_them_topping.png", "Modal Thêm Topping Mới")
back()

# --- 10. KHO HÀNG & NGUYÊN LIỆU ---
print("\n=== 10. KHO HÀNG & NGUYÊN LIỆU ===")
open_sidebar()
tap(400, 900, delay=1.5)
capture("60_kho_hang_ton_kho.png", "Kho Hàng - Tab Tồn Kho Nguyên Liệu")

tap(920, 110, delay=1.2)
capture("61_kho_hang_modal_them_nguyen_lieu.png", "Modal Thêm Nguyên Liệu Mới")
back()

find_tap(text_match="Nhập Kho", fallback=(500, 200))
capture("62_kho_hang_tab_nhap_kho.png", "Kho Hàng - Tab Lịch Sử Nhập Hàng")
tap(920, 110, delay=1.2)
capture("63_kho_hang_modal_phieu_nhap.png", "Modal Tạo Phiếu Nhập Kho")
back()

find_tap(text_match="Định Lượng", fallback=(850, 200))
capture("64_kho_hang_modal_dinh_luong_bom.png", "Kho Hàng - Tab Công Thức Định Lượng")

# --- 11. SỔ QUỸ CHI CHỢ ---
print("\n=== 11. SỔ QUỸ CHI CHỢ ===")
open_sidebar()
tap(400, 1050, delay=1.5)
capture("65_so_quy_danh_sach_thu_chi.png", "Sổ Quỹ - Danh Sách Thu Chi")

find_tap(text_match="Chi Chợ", fallback=(300, 310))
capture("66_so_quy_form_chi_cho_3s.png", "Form Chi Chợ 3 Giây Nhanh")
back()

find_tap(text_match="Thu", fallback=(650, 310))
capture("67_so_quy_modal_them_phieu_thu.png", "Modal Thêm Khoản Thu")
back()

find_tap(text_match="Chi Khác", fallback=(900, 310))
capture("68_so_quy_modal_them_khoan_chi.png", "Modal Thêm Khoản Chi Khác")
back()

# --- 12. GIAO CA ĐẾM KÉT ---
print("\n=== 12. GIAO CA ĐẾM KÉT ===")
open_sidebar()
tap(400, 1140, delay=1.5)
capture("69_giao_ca_tong_quan.png", "Giao Ca - Tổng Quan Bàn Giao Két")

find_tap(text_match="Đếm Tiền", fallback=(540, 1200))
capture("70_giao_ca_bang_dem_tien.png", "Bảng Đếm 9 Loại Tiền Polyme")

find_tap(text_match="Kết Ca", fallback=(540, 2300))
capture("71_giao_ca_ket_ca_lech_ket.png", "Giao Ca - Báo Cáo Chênh Lệch Két")
back()

# --- 13. BÁO CÁO LỢI NHUẬN ---
print("\n=== 13. BÁO CÁO LỢI NHUẬN ===")
open_sidebar()
tap(400, 1230, delay=1.5)
capture("72_bao_cao_3_con_so_vang.png", "Báo Cáo - 3 Con Số Vàng")

find_tap(text_match="Món Bán Chạy", fallback=(500, 200))
capture("73_bao_cao_tab_mon_ban_chay.png", "Báo Cáo - Tab Món Bán Chạy")

find_tap(text_match="Hóa Đơn", fallback=(850, 200))
capture("74_bao_cao_tab_doanh_thu_gio.png", "Báo Cáo - Tab Hóa Đơn & Doanh Thu")

tap(540, 110, delay=1.2)
capture("75_bao_cao_modal_chon_ngay.png", "Modal Chọn Khoảng Thời Gian Báo Cáo")
back()

# --- 14. QUẢN LÝ NHÂN SỰ ---
print("\n=== 14. QUẢN LÝ NHÂN SỰ ===")
open_sidebar()
tap(400, 1320, delay=1.5)
capture("76_nhan_su_danh_sach_nhan_vien.png", "Nhân Sự - Danh Sách Nhân Viên")

tap(920, 110, delay=1.2)
capture("77_nhan_su_modal_them_nhan_vien.png", "Modal Thêm Nhân Viên Mới")
back()

find_tap(text_match="Điểm Danh", fallback=(500, 200))
capture("78_nhan_su_tab_diem_danh.png", "Nhân Sự - Tab Điểm Danh & Chấm Công")

find_tap(text_match="Bảng Lương", fallback=(850, 200))
capture("79_nhan_su_tab_bang_luong.png", "Nhân Sự - Tab Bảng Lương & Chi Trả")

tap(540, 500, delay=1.5)
capture("80_nhan_su_modal_chi_tiet_luong.png", "Chi Tiết Bóc Tách Thu Nhập Nhân Sự")
back()

# --- 15. QUẢN LÝ KHÁCH HÀNG CRM ---
print("\n=== 15. QUẢN LÝ KHÁCH HÀNG CRM ===")
open_sidebar()
tap(400, 1410, delay=1.5)
capture("81_khach_hang_danh_sach.png", "Khách Hàng - Danh Sách Khách CRM")

tap(920, 110, delay=1.2)
capture("82_khach_hang_modal_them_moi.png", "Modal Thêm Khách Hàng Mới")
back()

tap(540, 450, delay=1.5)
capture("83_khach_hang_chi_tiet_so_no.png", "Chi Tiết Khách Hàng & Sổ Ghi Nợ")

if find_tap(text_match="Thu Nợ", fallback=(540, 2350)):
    capture("84_khach_hang_modal_tra_no.png", "Modal Thu Nợ / Ghi Nhận Thanh Toán")
    back()
back()

# --- 16. CÀI ĐẶT HỆ THỐNG ---
print("\n=== 16. CÀI ĐẶT HỆ THỐNG ===")
open_sidebar()
tap(400, 1560, delay=1.5)
capture("85_cai_dat_thong_tin_quan.png", "Cài Đặt - Thông Tin Quán & Thương Hiệu")

find_tap(text_match="VietQR", fallback=(320, 310))
capture("86_cai_dat_bank_vietqr.png", "Cài Đặt - Cấu Hình Ngân Hàng & VietQR")

find_tap(text_match="Mẫu Bill", fallback=(500, 310))
capture("87_cai_dat_bill_in_nhiet.png", "Cài Đặt - Mẫu Bill In Nhiệt & Bật Két")

find_tap(text_match="Chi Nhánh", fallback=(700, 310))
capture("88_cai_dat_chi_nhanh.png", "Cài Đặt - Quản Lý Chi Nhánh")

find_tap(text_match="Vận Hành", fallback=(880, 310))
capture("89_cai_dat_van_hanh_bao_mat.png", "Cài Đặt - Vận Hành & Khóa Hủy Món")

swipe(900, 310, 200, 310, duration=300)
find_tap(text_match="Chủ Quán", fallback=(850, 310))
capture("90_cai_dat_tai_khoan_chu_quan.png", "Cài Đặt - Tài Khoản Chủ Quán & Đổi PIN")

# --- 17. MÀN HÌNH PHỤ KHÁCH HÀNG CFD ---
print("\n=== 17. MÀN HÌNH PHỤ KHÁCH HÀNG CFD ===")
open_sidebar()
tap(400, 1650, delay=1.5)
capture("91_cfd_customer_screen.png", "Màn Hình Phụ Khách Hàng CFD")
back()

# --- 18. HƯỚNG DẪN SỬ DỤNG ---
print("\n=== 18. HƯỚNG DẪN SỬ DỤNG ===")
open_sidebar()
tap(150, 1850, delay=1.5)
capture("93_huong_dan_su_dung.png", "Sổ Tay Hướng Dẫn Sử Dụng")
back()

# --- 19. DARK MODE & OLED THEMES ---
print("\n=== 19. DARK MODE & OLED THEMES ===")
open_sidebar()
tap(640, 110, delay=1.5)
close_sidebar()
capture("94_dark_mode_pos.png", "Bán Hàng - Giao Diện Dark Mode (Cà Phê & Gỗ Gụ)")

open_sidebar()
tap(640, 110, delay=1.5)
close_sidebar()
capture("95_oled_mode_pos.png", "Bán Hàng - Giao Diện OLED Pitch Black (#000000)")

open_sidebar()
tap(640, 110, delay=1.5)
close_sidebar()
capture("96_light_mode_pos_restored.png", "Bán Hàng - Khôi Phục Light Mode")

print("\nHOÀN THÀNH TOÀN BỘ QUY TRÌNH CHỤP MÀN HÌNH!")
