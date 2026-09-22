import os
import sys
import time
import subprocess
from PIL import Image

ADB_PATH = r"D:\tools\platform-tools\adb.exe"
DEVICE = "QV72022C31"
OUTPUT_DIR = r"D:\duanpos-ongchu\anh"

def adb_cmd(args, timeout=15):
    cmd = [ADB_PATH, "-s", DEVICE] + args
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="ignore")
    return res.stdout.strip()

def tap(x, y, delay=1.2):
    adb_cmd(["shell", "input", "tap", str(x), str(y)])
    time.sleep(delay)

def capture(filename, desc=""):
    save_path = os.path.join(OUTPUT_DIR, filename)
    adb_cmd(["shell", "rm", "-f", "/sdcard/sony_cap.png"])
    adb_cmd(["shell", "screencap", "-p", "/sdcard/sony_cap.png"])
    adb_cmd(["pull", "/sdcard/sony_cap.png", save_path])
    try:
        with Image.open(save_path) as img:
            img.save(save_path, "PNG", optimize=True)
        size_kb = os.path.getsize(save_path) // 1024
        print(f"[OK] {filename} ({size_kb} KB) - {desc}")
    except Exception as e:
        print(f"[ERR] {filename}: {e}")

# 1. Quay lại POS
tap(100, 140, 1.2) # Back hoặc Drawer
tap(350, 490, 1.2) # Về POS

# 2. Bấm nút Thanh Toán ở đáy
tap(864, 2426, 1.2)

# 3. Chạm nút "Mang Về ⚡" trên Modal Chọn Bàn
tap(260, 650, 2.0)

# Chụp Màn hình Thanh Toán Tổng Quan
capture("10_thanh_toan_tong_quan.png", "Thanh Toán - Tổng quan chiết khấu & bóc tách hóa đơn")

# Chạm Tab Tiền Mặt
tap(180, 480, 1.2)
capture("11_thanh_toan_tien_mat_numpad.png", "Thanh Toán - Phím số Numpad & Gợi ý tiền thừa")

# Chạm Tab VietQR
tap(420, 480, 1.5)
capture("12_thanh_toan_vietqr_napas247.png", "Thanh Toán - VietQR Napas247 động")

# Quay lại POS
adb_cmd(["shell", "input", "keyevent", "4"])
time.sleep(1.0)

# Sổ Quỹ - Mở Modal + Lập Phiếu
tap(80, 140, 1.2) # Drawer
tap(350, 1300, 1.5) # Sổ Quỹ
tap(730, 140, 1.5) # Nút + Lập Phiếu
capture("18_so_quy_tao_phieu_chi_3s.png", "Sổ Quỹ - Modal tạo phiếu chi chợ 3 giây")
adb_cmd(["shell", "input", "keyevent", "4"])
time.sleep(1.0)

# Quay lại POS an toàn
tap(80, 140, 1.2)
tap(350, 490, 1.2)

print("DONE PAYMENT & CASHBOOK RECAPTURE")
