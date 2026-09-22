#!/usr/bin/env python3
"""
Generate professional annotated screenshots with bounding boxes,
directional arrows, numbered badges, and callouts for OngChu POS documentation.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"C:\Users\locthanhit\.gemini\antigravity\brain\96febcef-886f-40d2-80e4-a909a3a56085\guide_images"

FONT_BOLD_PATH = r"C:\Windows\Fonts\segoeuib.ttf"
if not os.path.exists(FONT_BOLD_PATH):
    FONT_BOLD_PATH = r"C:\Windows\Fonts\arialbd.ttf"

FONT_REG_PATH = r"C:\Windows\Fonts\segoeui.ttf"
if not os.path.exists(FONT_REG_PATH):
    FONT_REG_PATH = r"C:\Windows\Fonts\arial.ttf"

font_title = ImageFont.truetype(FONT_BOLD_PATH, 28)
font_badge = ImageFont.truetype(FONT_BOLD_PATH, 26)
font_pin = ImageFont.truetype(FONT_BOLD_PATH, 24)
font_desc = ImageFont.truetype(FONT_REG_PATH, 22)

COLOR_PRIMARY = (239, 68, 68, 255)       # Red #EF4444
COLOR_PRIMARY_ALPHA = (239, 68, 68, 30)   # Transparent Red
COLOR_JADE = (13, 148, 136, 255)         # Jade #0D9488
COLOR_JADE_ALPHA = (13, 148, 136, 30)     # Transparent Jade
COLOR_BLUE = (37, 99, 235, 255)          # Blue #2563EB
COLOR_BLUE_ALPHA = (37, 99, 235, 30)
COLOR_WHITE = (255, 255, 255, 255)
COLOR_YELLOW = (250, 204, 21, 255)
COLOR_MUTED = (148, 163, 184, 255)       # Slate 400
COLOR_CARD_BG = (15, 23, 42, 240)        # Dark Slate Glass

def draw_rounded_box(draw, overlay_draw, box, stroke_color, fill_color, width=6, radius=16):
    x0, y0, x1, y1 = box
    overlay_draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill_color)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=stroke_color, width=width)

def draw_pin_badge(draw, cx, cy, text, bg_color=COLOR_PRIMARY, radius=22):
    """Draw a numbered circular pin badge centered at (cx, cy)."""
    # Shadow
    draw.ellipse([cx - radius + 2, cy - radius + 2, cx + radius + 2, cy + radius + 2], fill=(0, 0, 0, 110))
    # Circle
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=bg_color, outline=COLOR_WHITE, width=2)
    # Text
    bbox = font_pin.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - 2), text, font=font_pin, fill=COLOR_WHITE)

def draw_arrow(draw, start, end, color=COLOR_PRIMARY, width=6, arrow_len=24, arrow_angle=32):
    draw.line([start, end], fill=color, width=width)
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    angle = math.atan2(dy, dx)
    angle1 = angle + math.radians(180 - arrow_angle)
    angle2 = angle + math.radians(180 + arrow_angle)
    p1 = (end[0] + arrow_len * math.cos(angle1), end[1] + arrow_len * math.sin(angle1))
    p2 = (end[0] + arrow_len * math.cos(angle2), end[1] + arrow_len * math.sin(angle2))
    draw.polygon([end, p1, p2], fill=color)

def draw_info_banner(draw, x0, y0, x1, y1, pin_text, title_text, desc_text, border_color=COLOR_PRIMARY, pin_color=COLOR_PRIMARY):
    """Draw a high-contrast Figma-style floating info banner."""
    # Shadow
    draw.rounded_rectangle([x0 + 4, y0 + 4, x1 + 4, y1 + 4], radius=16, fill=(0, 0, 0, 110))
    # Card Body
    draw.rounded_rectangle([x0, y0, x1, y1], radius=16, fill=COLOR_CARD_BG, outline=border_color, width=2)
    # Pin
    pin_cx = x0 + 46
    pin_cy = (y0 + y1) // 2
    draw_pin_badge(draw, pin_cx, pin_cy, pin_text, bg_color=pin_color, radius=22)
    # Text
    text_x = x0 + 86
    draw.text((text_x, y0 + 18), title_text, font=font_badge, fill=COLOR_WHITE)
    draw.text((text_x, y0 + 54), desc_text, font=font_desc, fill=COLOR_YELLOW)

# ----------------------------------------------------------------------
# 1. STEP 1: Select Tab "Danh Mục"
# ----------------------------------------------------------------------
def process_step1():
    in_path = os.path.join(BASE_DIR, "step1_raw.png")
    out_path = os.path.join(BASE_DIR, "guide_step1_select_tab.png")
    img = Image.open(in_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    overlay_draw = ImageDraw.Draw(overlay)

    # Box around Tab "Danh Mục (6)" [360, 275, 720, 391]
    box = (355, 270, 725, 396)
    draw_rounded_box(draw, overlay_draw, box, COLOR_PRIMARY, COLOR_PRIMARY_ALPHA, width=7, radius=14)

    # Pin badge ① on top right corner
    draw_pin_badge(draw, 720, 275, "1", bg_color=COLOR_PRIMARY, radius=22)

    # Short arrow pointing up to center of tab
    draw_arrow(draw, (540, 480), (540, 405), color=COLOR_PRIMARY, width=6, arrow_len=22)

    # Clean banner positioned below arrow
    draw_info_banner(draw, 60, 490, 1020, 595, "1", "BƯỚC 1: CHẠM TAB [DANH MỤC]", "Chuyển từ danh sách món sang màn hình quản lý nhóm", border_color=COLOR_PRIMARY, pin_color=COLOR_PRIMARY)

    img = Image.alpha_composite(img, overlay)
    w, h = img.size
    img = img.resize((720, int(h * (720 / w))), Image.Resampling.LANCZOS)
    img.convert("RGB").save(out_path, "PNG", quality=95)
    print(f"Generated: {out_path}")

# ----------------------------------------------------------------------
# 2. STEP 2: Click Button "+ Thêm Nhóm"
# ----------------------------------------------------------------------
def process_step2():
    in_path = os.path.join(BASE_DIR, "step2_raw.png")
    out_path = os.path.join(BASE_DIR, "guide_step2_click_add_group.png")
    img = Image.open(in_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    overlay_draw = ImageDraw.Draw(overlay)

    # Box around Button "Thêm Nhóm" [697, 420, 1038, 515]
    box = (690, 415, 1045, 520)
    draw_rounded_box(draw, overlay_draw, box, COLOR_PRIMARY, COLOR_PRIMARY_ALPHA, width=7, radius=16)

    # Pin badge ② on the button corner
    draw_pin_badge(draw, 690, 420, "2", bg_color=COLOR_PRIMARY, radius=22)

    # Short arrow pointing up into button from below
    draw_arrow(draw, (867, 590), (867, 528), color=COLOR_PRIMARY, width=6, arrow_len=22)

    # Instruction banner placed in the empty canvas below all rows (unblocking all 6 items!)
    draw_info_banner(draw, 60, 1620, 1020, 1725, "2", "BƯỚC 2: BẤM NÚT [+ THÊM NHÓM]", "Mở hộp thoại tạo nhóm phân loại thực đơn mới", border_color=COLOR_PRIMARY, pin_color=COLOR_PRIMARY)

    img = Image.alpha_composite(img, overlay)
    w, h = img.size
    img = img.resize((720, int(h * (720 / w))), Image.Resampling.LANCZOS)
    img.convert("RGB").save(out_path, "PNG", quality=95)
    print(f"Generated: {out_path}")

# ----------------------------------------------------------------------
# 3. STEP 3: Fill Modal (Name, Icon, Submit)
# ----------------------------------------------------------------------
def process_step3():
    in_path = os.path.join(BASE_DIR, "step3_raw.png")
    out_path = os.path.join(BASE_DIR, "guide_step3_fill_modal.png")
    img = Image.open(in_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    overlay_draw = ImageDraw.Draw(overlay)

    # 1. Box around Input Name [108, 934, 974, 1051]
    box_name = (100, 928, 980, 1056)
    draw_rounded_box(draw, overlay_draw, box_name, COLOR_PRIMARY, COLOR_PRIMARY_ALPHA, width=6, radius=14)
    draw_pin_badge(draw, 975, 935, "1", bg_color=COLOR_PRIMARY, radius=22)

    # 2. Box around Selected Cake Icon [239, 1297, 349, 1407]
    box_icon = (235, 1293, 353, 1411)
    draw_rounded_box(draw, overlay_draw, box_icon, COLOR_JADE, COLOR_JADE_ALPHA, width=6, radius=16)
    draw_pin_badge(draw, 348, 1298, "2", bg_color=COLOR_JADE, radius=22)

    # 3. Box around Button "Tạo Nhóm" [556, 1471, 972, 1581]
    box_btn = (550, 1465, 978, 1587)
    draw_rounded_box(draw, overlay_draw, box_btn, COLOR_BLUE, COLOR_BLUE_ALPHA, width=6, radius=16)
    draw_pin_badge(draw, 972, 1472, "3", bg_color=COLOR_BLUE, radius=22)

    # Unified Instructions Card in the clean dark space below modal (zero arrows crossing the modal!)
    card_x0, card_y0 = 60, 1660
    card_x1, card_y1 = 1020, 2010
    # Shadow
    draw.rounded_rectangle([card_x0 + 4, card_y0 + 4, card_x1 + 4, card_y1 + 4], radius=18, fill=(0, 0, 0, 120))
    # Card Body
    draw.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=18, fill=COLOR_CARD_BG, outline=(255, 255, 255, 50), width=2)
    
    # Step 1 item in card
    draw_pin_badge(draw, 110, 1715, "1", bg_color=COLOR_PRIMARY, radius=20)
    draw.text((150, 1700), "NHẬP TÊN DANH MỤC: \"Bánh Ngọt\"", font=font_badge, fill=COLOR_WHITE)
    draw.text((150, 1732), "Tên nhóm hiển thị trực tiếp trên menu bán hàng", font=font_desc, fill=COLOR_MUTED)

    # Step 2 item in card
    draw_pin_badge(draw, 110, 1815, "2", bg_color=COLOR_JADE, radius=20)
    draw.text((150, 1800), "CHỌN BIỂU TƯỢNG ĐẠI DIỆN (BÁNH KEM)", font=font_badge, fill=COLOR_WHITE)
    draw.text((150, 1832), "Icon sinh động giúp nhận biết nhanh danh mục", font=font_desc, fill=COLOR_MUTED)

    # Step 3 item in card
    draw_pin_badge(draw, 110, 1915, "3", bg_color=COLOR_BLUE, radius=20)
    draw.text((150, 1900), "BẤM NÚT [TẠO NHÓM]", font=font_badge, fill=COLOR_WHITE)
    draw.text((150, 1932), "Lưu tức thì 0ms, danh mục hiển thị ngay trên thực đơn", font=font_desc, fill=COLOR_YELLOW)

    img = Image.alpha_composite(img, overlay)
    w, h = img.size
    img = img.resize((720, int(h * (720 / w))), Image.Resampling.LANCZOS)
    img.convert("RGB").save(out_path, "PNG", quality=95)
    print(f"Generated: {out_path}")

# ----------------------------------------------------------------------
# 4. STEP 4: Success Result
# ----------------------------------------------------------------------
def process_step4():
    in_path = os.path.join(BASE_DIR, "step4_raw.png")
    out_path = os.path.join(BASE_DIR, "guide_step4_category_ready.png")
    img = Image.open(in_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    overlay_draw = ImageDraw.Draw(overlay)

    # Highlight the newly created category row 7: [0, 1546, 1080, 1711]
    box = (30, 1540, 1050, 1718)
    draw_rounded_box(draw, overlay_draw, box, COLOR_JADE, COLOR_JADE_ALPHA, width=7, radius=16)

    # Success pin badge 4
    draw_pin_badge(draw, 1025, 1545, "4", bg_color=COLOR_JADE, radius=22)

    # Arrow pointing UP to new category from below
    draw_arrow(draw, (540, 1775), (540, 1726), color=COLOR_JADE, width=6, arrow_len=22)
    
    # Success Banner positioned above toast
    draw_info_banner(draw, 60, 1785, 1020, 1890, "4", "HOÀN TẤT: DANH MỤC ĐÃ ĐƯỢC TẠO THÀNH CÔNG!", "Nhóm 'Banh Ngot' đã sẵn sàng phục vụ bán hàng", border_color=COLOR_JADE, pin_color=COLOR_JADE)

    img = Image.alpha_composite(img, overlay)
    w, h = img.size
    img = img.resize((720, int(h * (720 / w))), Image.Resampling.LANCZOS)
    img.convert("RGB").save(out_path, "PNG", quality=95)
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    process_step1()
    process_step2()
    process_step3()
    process_step4()
    print("All 4 annotated guide images successfully generated!")



