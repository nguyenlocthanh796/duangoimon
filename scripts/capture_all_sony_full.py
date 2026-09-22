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
    tap(80, 140, 1.2)

def close_drawer():
    tap(950, 1000, 0.8)

def toggle_dark_mode():
    open_drawer()
    tap(595, 140, 1.2)
    close_drawer()

def verify_app_running():
    out = adb_cmd(["shell", "dumpsys", "activity", "activities"])
    if "host.exp.exponent" not in out:
        print("[WARNING] App not in foreground, launching Expo...")
        adb_cmd(["shell", "monkey", "-p", "host.exp.exponent", "-c", "android.intent.category.LAUNCHER", "1"])
        time.sleep(3.0)

def main():
    print("================================================================")
    print("START CAPTURING SONY XPERIA (DEMO STORE)")
    print("================================================================")
    sys.stdout.flush()
    verify_app_running()

    # --- 1. SƠ ĐỒ BÀN & POS ---
    print("\n--- 1. POS So Do Ban & Ban Hang ---")
    open_drawer()
    capture_screen("02_sidebar_drawer.png", "Sidebar Drawer - Menu dieu huong")
    tap(350, 490, 1.5) # So Do Ban & Ban Hang
    
    # 03: So do ban tat ca
    capture_screen("03_pos_so_do_ban.png", "POS - So do ban an (Tat ca khu vuc)")
    
    # 04: Loc khu vuc
    tap(830, 260, 1.0) # Tab Tang 2 / San Vuon
    capture_screen("04_pos_so_do_ban_loc_khu_vuc.png", "POS - So do ban loc khu vuc")
    tap(530, 260, 1.0) # Tra ve tab Tat ca

    # 05: Thuc don mon an
    print("\n--- 2. POS Thuc Don & Gio Hang ---")
    tap(300, 500, 1.0)
    time.sleep(1.0)
    capture_screen("05_pos_thuc_don_mon_an.png", "POS - Thuc don mon an")

    # 06: Modal Topping / Modifier
    tap(980, 400, 1.2)
    capture_screen("06_pos_modal_topping_modifier.png", "POS - Modal Topping & Modifier")
    keyevent(4, 0.8)

    # Them mon vao gio
    tap(820, 390, 0.8)
    tap(820, 580, 0.8)
    
    # 08: Bottom bar action
    capture_screen("08_pos_bottom_bar_action.png", "POS - Thanh tac vu Gio hang & Bao Bep")

    # 07: Mo Modal Gio Hang
    tap(105, 2426, 1.2)
    capture_screen("07_pos_gio_hang_co_mon.png", "POS - Gio hang chi tiet mon da chon")
    keyevent(4, 0.8)

    # 09: Chuyen ban / Gan ban
    tap(850, 140, 1.2)
    capture_screen("09_pos_chuyen_ghep_ban.png", "POS - Modal Chuyen ban / Ghep ban")
    keyevent(4, 0.8)

    # --- 3. THANH TOAN ---
    print("\n--- 3. Thanh Toan ---")
    tap(864, 2426, 1.8)
    capture_screen("10_thanh_toan_tong_quan.png", "Thanh Toan - Tong quan hoa don")

    # Tab Tien Mat Numpad
    tap(180, 480, 1.0)
    capture_screen("11_thanh_toan_tien_mat_numpad.png", "Thanh Toan - Tien mat Numpad")

    # Tab VietQR Napas 247
    tap(420, 480, 1.2)
    capture_screen("12_thanh_toan_vietqr_napas247.png", "Thanh Toan - VietQR Napas247")
    keyevent(4, 1.2)

    # --- 4. BEP & BAR KDS ---
    print("\n--- 4. Bep & Bar KDS ---")
    open_drawer()
    tap(350, 600, 1.5)
    capture_screen("13_kds_tong_quan.png", "KDS - Man hinh Bep & Bar")

    # Loc Pha Che
    tap(450, 260, 1.0)
    capture_screen("14_kds_bo_loc_tram.png", "KDS - Loc theo tram Pha Che")
    tap(150, 260, 0.8)

    # --- 5. SO HOA DON ---
    print("\n--- 5. So Hoa Don ---")
    open_drawer()
    tap(350, 700, 1.5)
    capture_screen("15_hoa_don_danh_sach.png", "So Hoa Don - Danh sach hoa don")

    # Chi tiet Bill
    tap(540, 520, 1.2)
    capture_screen("16_hoa_don_chi_tiet_bill.png", "So Hoa Don - Chi tiet bill in nhiet")
    keyevent(4, 0.8)

    # --- 6. SO QUY CHI CHO 3S ---
    print("\n--- 6. So Quy Chi Cho ---")
    open_drawer()
    tap(350, 1300, 1.5)
    capture_screen("17_so_quy_tong_quan.png", "So Quy - Tong thu, chi & quy tien mat")

    # Modal tao phieu chi
    tap(950, 140, 1.2)
    capture_screen("18_so_quy_tao_phieu_chi_3s.png", "So Quy - Modal tao phieu chi cho 3s")
    keyevent(4, 0.8)

    # --- 7. GIAO CA DEM KET 30S ---
    print("\n--- 7. Giao Ca Dem Ket ---")
    open_drawer()
    tap(350, 1410, 1.5)
    capture_screen("19_giao_ca_dem_ket.png", "Giao Ca - Bang dem ket tien")
    swipe(500, 1800, 500, 800, 300, 1.2)
    capture_screen("20_giao_ca_tong_ket_ca.png", "Giao Ca - Bang tong ket chot ca")
    swipe(500, 800, 500, 1800, 300, 0.8)

    # --- 8. BAO CAO LOI NHUAN ---
    print("\n--- 8. Bao Cao Loi Nhuan ---")
    open_drawer()
    tap(350, 1520, 1.5)
    capture_screen("21_bao_cao_3_con_so_vang.png", "Bao Cao - 3 Con So Vang")
    
    # Bieu do
    swipe(500, 1600, 500, 700, 300, 1.2)
    capture_screen("22_bao_cao_bieu_do_doanh_thu.png", "Bao Cao - Bieu do doanh thu")
    
    # Top mon
    swipe(500, 1800, 500, 800, 300, 1.2)
    capture_screen("23_bao_cao_mon_ban_chay.png", "Bao Cao - Top mon ban chay")
    swipe(500, 600, 500, 2000, 300, 0.8)

    # --- 9. QUAN LY THUC DON ---
    print("\n--- 9. Quan Ly Thuc Don ---")
    open_drawer()
    tap(350, 990, 1.5)
    capture_screen("24_thuc_don_danh_sach.png", "Thuc Don - Danh sach mon & gia")
    capture_screen("25_thuc_don_bao_het_86.png", "Thuc Don - Bao het mon 86 & Doi gia")
    
    # Modal them/sua mon
    tap(950, 140, 1.2)
    capture_screen("26_thuc_don_them_sua_mon.png", "Thuc Don - Form them/sua mon an")
    keyevent(4, 0.8)

    # --- 10. QUAN LY KHACH HANG & SO NO ---
    print("\n--- 10. Khach Hang & So No ---")
    open_drawer()
    tap(350, 1740, 1.5)
    capture_screen("27_khach_hang_danh_sach.png", "Khach Hang - Danh sach & tich diem")
    tap(750, 260, 1.2)
    capture_screen("28_khach_hang_so_no_cong_no.png", "Khach Hang - So no cong no")

    # --- 11. KHO & HANG HOA ---
    print("\n--- 11. Kho Hang ---")
    open_drawer()
    tap(350, 1100, 1.5)
    capture_screen("29_kho_hang_ton_kho.png", "Kho Hang - Ton kho & canh bao")
    tap(750, 260, 1.2)
    capture_screen("30_kho_hang_nhap_kho.png", "Kho Hang - Phieu nhap kho")

    # --- 12. NHAN SU & CA LUONG ---
    print("\n--- 12. Nhan Su ---")
    open_drawer()
    tap(350, 1630, 1.5)
    capture_screen("31_nhan_su_danh_sach.png", "Nhan Su - Danh sach nhan vien & phan quyen")
    tap(750, 260, 1.2)
    capture_screen("32_nhan_su_bang_luong_cham_cong.png", "Nhan Su - Bang luong & cham cong")

    # --- 13. QUAN LY BAN ---
    print("\n--- 13. Quan Ly Ban ---")
    open_drawer()
    tap(350, 890, 1.5)
    capture_screen("33_quan_ly_ban_so_do.png", "Quan Ly Ban - Thiet lap so do ban")

    # --- 14. CAI DAT HE THONG ---
    print("\n--- 14. Cai Dat He Thong ---")
    open_drawer()
    tap(350, 1930, 1.5)
    capture_screen("34_cai_dat_thong_tin_quan.png", "Cai Dat - Thong tin quan & thuong hieu")
    tap(420, 260, 1.2)
    capture_screen("35_cai_dat_vietqr_ngan_hang.png", "Cai Dat - VietQR Napas247")
    tap(750, 260, 1.2)
    capture_screen("36_cai_dat_mau_in_k80_k58.png", "Cai Dat - Mau in K80/K58 & may in 9100")

    # --- 15. MAN PHU KHACH CFD ---
    print("\n--- 15. Man Phu Khach CFD ---")
    open_drawer()
    tap(350, 2040, 1.8)
    capture_screen("37_cfd_man_hinh_khach.png", "CFD - Man hinh phu huong khach hang")
    keyevent(4, 1.2)

    # --- 16. HUONG DAN SU DUNG ---
    print("\n--- 16. Huong Dan Su Dung ---")
    open_drawer()
    tap(150, 2280, 1.5)
    capture_screen("38_huong_dan_su_dung.png", "Huong Dan - Cam nang 1-cham")
    keyevent(4, 1.0)

    # --- 17. DARK MODE ---
    print("\n--- 17. Dark Mode ---")
    toggle_dark_mode()
    time.sleep(1.2)

    # Ban hang Dark Mode
    open_drawer()
    tap(350, 490, 1.5)
    capture_screen("39_dark_mode_pos.png", "Dark Mode - Ban hang POS")

    # Bao Cao Dark Mode
    open_drawer()
    tap(350, 1520, 1.5)
    capture_screen("40_dark_mode_bao_cao.png", "Dark Mode - Bao cao 3 Con So Vang")

    # Bep KDS Dark Mode
    open_drawer()
    tap(350, 600, 1.5)
    capture_screen("41_dark_mode_kds.png", "Dark Mode - Bep / Bar KDS")

    # So Quy Dark Mode
    open_drawer()
    tap(350, 1300, 1.5)
    capture_screen("42_dark_mode_so_quy.png", "Dark Mode - So Quy Chi Cho")

    # Tra ve Light Mode
    toggle_dark_mode()
    time.sleep(1.0)

    print("\n================================================================")
    print("SUCCESS: 40+ SCREENSHOTS CAPTURED ON SONY XPERIA")
    print("================================================================")
    sys.stdout.flush()

if __name__ == "__main__":
    main()
