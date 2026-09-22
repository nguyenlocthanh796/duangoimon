#!/usr/bin/env python3
"""
Công cụ kiểm tra & đo kiểm chất lượng UI/UX (A11y Touch Target, Color Contrast, Hex Linter)
Dự án OngChu Lean POS - Tuân thủ triết lý Ponytail tối giản, không phụ thuộc thư viện nặng.
"""

import os
import re
import sys
import math
import subprocess
import xml.etree.ElementTree as ET

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ADB_PATH = r"D:\tools\platform-tools\adb.exe"
if not os.path.exists(ADB_PATH):
    ADB_PATH = "adb"

IGNORED_DEVICES = ["QV72022C31"]
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_adb(cmd_args, device="emulator-5554"):
    full_cmd = [ADB_PATH, "-s", device] + cmd_args
    try:
        res = subprocess.run(full_cmd, capture_output=True, text=True, timeout=10, encoding="utf-8", errors="ignore")
        return res.stdout.strip()
    except Exception as e:
        return f"Error: {e}"

def get_device_density(device="emulator-5554"):
    out = run_adb(["shell", "wm", "density"], device=device)
    # Output e.g.: "Physical density: 440" or "Override density: 440"
    m = re.search(r"density:\s*(\d+)", out)
    if m:
        dpi = int(m.group(1))
        return dpi / 160.0  # 160 dpi = 1.0x (mdpi)
    return 2.75  # Pixel standard default

# ==============================================================================
# 1. A11Y TOUCH TARGET AUDITOR (ANDROID ACCESSIBILITY SCANNER LITE)
# ==============================================================================
def audit_touch_targets(device="emulator-5554", min_dp=40):
    print(f"\n========================================================")
    print(f"🔍 1. KIỂM TRA KÍCH THƯỚC VÙNG CHẠM TOUCH TARGET (A11Y)")
    print(f"   Thiết bị mục tiêu: {device}")
    print(f"========================================================")
    
    scale = get_device_density(device)
    print(f"ℹ️ Mật độ hiển thị: {scale:.2f}x (1dp = {scale:.2f}px)")
    
    # Dump UI
    run_adb(["shell", "uiautomator", "dump", "/sdcard/window_dump.xml"], device=device)
    xml_content = run_adb(["shell", "cat", "/sdcard/window_dump.xml"], device=device)
    
    if not xml_content.startswith("<?xml") and "<hierarchy" not in xml_content:
        print("❌ Không thể lấy cấu trúc UI từ thiết bị.")
        return
        
    try:
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"❌ Lỗi parse XML: {e}")
        return

    clickable_elements = []
    
    for node in root.iter():
        if node.attrib.get("clickable") == "true":
            bounds = node.attrib.get("bounds", "")
            # Format: [x1,y1][x2,y2]
            m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
            if m:
                x1, y1, x2, y2 = map(int, m.groups())
                w_px = x2 - x1
                h_px = y2 - y1
                w_dp = round(w_px / scale, 1)
                h_dp = round(h_px / scale, 1)
                
                text = node.attrib.get("text", "").strip()
                content_desc = node.attrib.get("content-desc", "").strip()
                label = text or content_desc or "(Không có nhãn text)"
                
                clickable_elements.append({
                    "label": label[:35],
                    "class": node.attrib.get("class", "").split(".")[-1],
                    "bounds": bounds,
                    "w_dp": w_dp,
                    "h_dp": h_dp,
                    "w_px": w_px,
                    "h_px": h_px,
                })

    print(f"📊 Tìm thấy {len(clickable_elements)} phần tử có thể tương tác (clickable).")
    
    warnings = []
    passes = []
    
    for el in clickable_elements:
        if el["w_dp"] < min_dp or el["h_dp"] < min_dp:
            warnings.append(el)
        else:
            passes.append(el)
            
    print(f"✅ Đạt chuẩn (>= {min_dp}dp): {len(passes)} phần tử")
    if warnings:
        print(f"⚠️ Cảnh báo vùng bấm hẹp (< {min_dp}dp): {len(warnings)} phần tử:")
        for w in warnings:
            print(f"   - [{w['label']}] Kích thước: {w['w_dp']}x{w['h_dp']}dp ({w['w_px']}x{w['h_px']}px) tại {w['bounds']}")
    else:
        print(f"🎉 100% phần tử tương tác trên màn hình hiện tại đều đạt chuẩn công thái học ngón cái!")

# ==============================================================================
# 2. COLOR CONTRAST AUDITOR (WCAG 2.1 AAA / AA)
# ==============================================================================
def srgb_to_luminance(r, g, b):
    def channel_lum(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * channel_lum(r) + 0.7152 * channel_lum(g) + 0.0722 * channel_lum(b)

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join([c * 2 for c in hex_str])
    elif len(hex_str) == 8:
        hex_str = hex_str[:6]  # Bỏ alpha
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def calc_contrast_ratio(hex1, hex2):
    try:
        rgb1 = hex_to_rgb(hex1)
        rgb2 = hex_to_rgb(hex2)
        l1 = srgb_to_luminance(*rgb1)
        l2 = srgb_to_luminance(*rgb2)
        brightest = max(l1, l2)
        darkest = min(l1, l2)
        return (brightest + 0.05) / (darkest + 0.05)
    except Exception:
        return 0.0

def audit_theme_contrast():
    print(f"\n========================================================")
    print(f"🎨 2. ĐO KIỂM ĐỘ TƯƠNG PHẢN MÀU SẮC (WCAG 2.1 AAA/AA)")
    print(f"========================================================")
    
    colors_file = os.path.join(PROJECT_ROOT, "frontend", "lib", "theme", "colors.ts")
    light_tokens = {}
    dark_tokens = {}
    
    if os.path.exists(colors_file):
        with open(colors_file, "r", encoding="utf-8") as f:
            content = f.read()
        # Parse lightTheme and darkTheme blocks
        light_match = re.search(r"export const lightTheme = \{(.*?)\};", content, re.DOTALL)
        dark_match = re.search(r"export const darkTheme = \{(.*?)\};", content, re.DOTALL)
        
        def parse_tokens(block_str):
            tokens = {}
            current_section = ""
            for line in block_str.splitlines():
                sec_match = re.search(r"^\s*([a-zA-Z0-9_]+):\s*\{", line)
                if sec_match:
                    current_section = sec_match.group(1)
                    continue
                m = re.search(r"^\s*([a-zA-Z0-9_]+):\s*['\"](#[0-9a-fA-F]{6})['\"]", line)
                if m:
                    key = f"{current_section}.{m.group(1)}" if current_section else m.group(1)
                    tokens[key] = m.group(2)
            return tokens
            
        if light_match:
            light_tokens = parse_tokens(light_match.group(1))
        if dark_match:
            dark_tokens = parse_tokens(dark_match.group(1))
            
    pairs_to_test = [
        ("Chữ chính trên Nền App", "text.primary", "surface.app"),
        ("Chữ chính trên Thẻ Card", "text.primary", "surface.card"),
        ("Chữ phụ trên Thẻ Card", "text.muted", "surface.card"),
        ("Chữ phụ trên Nền Header", "text.muted", "surface.header"),
        ("Chữ trắng trên Nút Brand", "text.onBrand", "brand.primary"),
        ("Nút Brand trên Nền App", "brand.primary", "surface.app"),
        ("Cảnh báo Đỏ trên Thẻ Card", "brand.danger", "surface.card"),
        ("Cảnh báo Vàng trên Thẻ Card", "brand.warning", "surface.card"),
    ]
    
    for theme_name, tokens in [("☀️ LIGHT MODE", light_tokens), ("🌙 DARK MODE", dark_tokens)]:
        print(f"\n--- {theme_name} ---")
        for desc, fg_key, bg_key in pairs_to_test:
            fg_hex = tokens.get(fg_key)
            bg_hex = tokens.get(bg_key)
            if fg_hex and bg_hex:
                ratio = calc_contrast_ratio(fg_hex, bg_hex)
                status = "AAA (Rất Cao)" if ratio >= 7.0 else ("AA (Đạt Chuẩn)" if ratio >= 4.5 else "❌ KÉM (< 4.5)")
                print(f" • {desc:35}: {ratio:5.2f}:1 -> {status} [{fg_hex} trên {bg_hex}]")

# ==============================================================================
# 3. CODEBASE HEX HARDCODE LINTER
# ==============================================================================
def audit_hex_hardcode():
    print(f"\n========================================================")
    print(f"🧹 3. QUÉT MÃ MÀU HEX HARDCODE TRONG CODEBASE FRONTEND")
    print(f"========================================================")
    
    target_dirs = [
        os.path.join(PROJECT_ROOT, "frontend", "app"),
        os.path.join(PROJECT_ROOT, "frontend", "lib", "components"),
    ]
    
    hex_pattern = re.compile(r"['\"]#([0-9a-fA-F]{3,8})['\"]")
    allowed_hexes = {
        "#000000", "#000", "#FFFFFF", "#FFF",
        "#TRANSPARENT",
    }
    
    violations = []
    scanned_files = 0
    
    for d in target_dirs:
        for root_path, _, files in os.walk(d):
            for file in files:
                if file.endswith((".tsx", ".ts")) and not file.endswith(("colors.ts", "theme.ts")):
                    scanned_files += 1
                    fp = os.path.join(root_path, file)
                    rel_fp = os.path.relpath(fp, PROJECT_ROOT)
                    with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                        for line_no, line in enumerate(f, 1):
                            matches = hex_pattern.findall(line)
                            for m in matches:
                                full_hex = f"#{m.upper()}"
                                if full_hex not in allowed_hexes and "shadowColor" not in line:
                                    violations.append((rel_fp, line_no, full_hex, line.strip()))
                                    
    print(f"📁 Đã quét {scanned_files} tệp nguồn TypeScript/React Native.")
    if violations:
        print(f"⚠️ Phát hiện {len(violations)} vị trí hardcode mã màu hex cần đưa về useTheme():")
        for vf, lno, hx, ltxt in violations[:15]:
            print(f"   - {vf}:{lno} -> {hx} | {ltxt[:55]}")
        if len(violations) > 15:
            print(f"   ... và {len(violations) - 15} vị trí khác.")
    else:
        print("🎉 Không có mã màu hex hardcode vi phạm! Toàn bộ đều tuân thủ design system token.")

if __name__ == "__main__":
    device = "emulator-5554"
    if len(sys.argv) > 1:
        device = sys.argv[1]
    audit_touch_targets(device=device)
    audit_theme_contrast()
    audit_hex_hardcode()
