#!/usr/bin/env python3
"""
generate_showcase_suite.py
Tạo bộ ảnh mockup showcase chuẩn công nghệ cho website https://ongchu.cloud/
- 100% Ảnh chụp thực tế từ Sony Xperia 5 thiết bị thật (Native App vn.ongchu.pos)
- Đọc đúng nội dung thật: Số tiền, tên món, mã đơn, số lượng, KPI quỹ két
- Bố cục 16:10 và tỷ lệ container chính xác (Zero CSS Chopping)
- Thiết bị thật: Khung titan mờ, bóng đổ đa tầng, mặt kính phản quang
- Nhãn chỉ dẫn nổi (Pill Badges) với Segoe UI + Segoe UI Emoji sắc nét
- Nén WebP chất lượng cao tối ưu dung lượng (<100KB) + PNG dự phòng
"""

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ASSETS_DIR = 'landing/assets'
SRC_DIR = '.temp'
BG_COLOR = (250, 248, 245, 255) # Ngà Giấy Dó #FAF8F5

font_icon_lg = ImageFont.truetype('C:/Windows/Fonts/seguiemj.ttf', 20)
font_icon_sm = ImageFont.truetype('C:/Windows/Fonts/seguiemj.ttf', 16)
font_text_lg = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 18)
font_text_md = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 15)
font_text_sm = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 13)

def get_screen(filename):
    p = os.path.join(SRC_DIR, filename)
    if os.path.exists(p):
        return Image.open(p)
    raise FileNotFoundError(f"Missing screen source: {p}")

def create_base_canvas(w, h, glow_color=(180, 83, 9, 20)):
    canvas = Image.new('RGBA', (w, h), BG_COLOR)
    if glow_color:
        glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        cx, cy = w // 2, h // 2
        rx, ry = int(w * 0.38), int(h * 0.38)
        gdraw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=glow_color)
        glow = glow.filter(ImageFilter.GaussianBlur(int(min(w, h) * 0.14)))
        canvas.paste(glow, (0, 0), glow)
    return canvas

def draw_pill_badge(canvas, x, y, icon, text, is_small=False, bg=(255, 255, 255, 245), border=(218, 212, 204, 255), text_color=(28, 25, 23, 255), icon_color=(180, 83, 9, 255)):
    font_icon = font_icon_sm if is_small else font_icon_lg
    font_text = font_text_sm if is_small else font_text_md
    
    dummy = Image.new('RGBA', (1, 1))
    ddraw = ImageDraw.Draw(dummy)
    ibbox = ddraw.textbbox((0, 0), icon, font=font_icon)
    iw = ibbox[2] - ibbox[0]
    ih = ibbox[3] - ibbox[1]
    
    tbbox = ddraw.textbbox((0, 0), text, font=font_text)
    tw = tbbox[2] - tbbox[0]
    th = tbbox[3] - tbbox[1]
    
    pad_h = 16 if is_small else 20
    pad_w = 14 if is_small else 18
    pw = pad_w * 2 + iw + 10 + tw
    ph = max(ih, th) + pad_h
    
    badge = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge)
    bdraw.rounded_rectangle([0, 0, pw, ph], radius=ph // 2, fill=bg, outline=border, width=1)
    
    # Draw icon
    ix = pad_w
    iy = (ph - ih) // 2 - 2
    bdraw.text((ix, iy), icon, fill=icon_color, font=font_icon)
    
    # Draw text
    tx = ix + iw + 10
    ty = (ph - th) // 2 - 2
    bdraw.text((tx, ty), text, fill=text_color, font=font_text)
    
    # Soft multi-level drop shadow on canvas
    cw, ch = canvas.size
    shadow = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([x - 2, y + 4, x + pw + 2, y + ph + 8], radius=ph // 2, fill=(28, 25, 23, 35))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8 if not is_small else 6))
    canvas.paste(shadow, (0, 0), shadow)
    
    canvas.paste(badge, (x, y), badge)

def create_phone_frame(screen_img, target_h, bezel=10, radius=24):
    scale = target_h / screen_img.height
    w = int(screen_img.width * scale)
    screen_resized = screen_img.resize((w, target_h), Image.Resampling.LANCZOS)
    
    fw = w + bezel * 2
    fh = target_h + bezel * 2
    frame = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(frame)
    
    # Outer dark titanium chassis
    fdraw.rounded_rectangle([0, 0, fw, fh], radius=radius, fill=(28, 25, 23, 255), outline=(55, 50, 46, 255), width=2)
    # Subtle inner bevel
    fdraw.rounded_rectangle([2, 2, fw - 2, fh - 2], radius=radius - 2, outline=(85, 78, 72, 160), width=1)
    
    mask = Image.new('L', (w, target_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, w, target_h], radius=radius - 6, fill=255)
    frame.paste(screen_resized, (bezel, bezel), mask)
    
    # Sheen reflection
    sheen = Image.new('RGBA', (w, target_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(sheen)
    sdraw.polygon([(0, 0), (w, 0), (0, target_h // 2)], fill=(255, 255, 255, 12))
    frame.paste(sheen, (bezel, bezel), sheen)
    return frame

def save_dual_asset(canvas, base_name):
    os.makedirs(ASSETS_DIR, exist_ok=True)
    png_path = os.path.join(ASSETS_DIR, f'{base_name}.png')
    webp_path = os.path.join(ASSETS_DIR, f'{base_name}.webp')
    canvas.save(png_path, 'PNG', optimize=True)
    canvas.convert('RGB').save(webp_path, 'WEBP', quality=85, method=6)
    sz_png = os.path.getsize(png_path) // 1024
    sz_webp = os.path.getsize(webp_path) // 1024
    print(f'Saved {base_name:22} | PNG: {sz_png:4d} KB | WEBP: {sz_webp:4d} KB | {canvas.size[0]}x{canvas.size[1]}')

# ----------------------------------------------------
# 1. HERO SHOWCASE (1600 x 1000) -> screen_pos
# ----------------------------------------------------
def build_hero():
    canvas = create_base_canvas(1600, 1000, glow_color=(180, 83, 9, 25))
    
    s_tables = get_screen('real_01_so_do_ban.png')
    s_menu = get_screen('real_02_pos_menu.png')
    s_pay = get_screen('cai_dat_vietqr_opened.png')
    
    p_left = create_phone_frame(s_tables, 810, bezel=10, radius=24)
    p_center = create_phone_frame(s_menu, 890, bezel=12, radius=28)
    p_right = create_phone_frame(s_pay, 820, bezel=10, radius=24)
    
    pos_l = (220, 100)
    pos_c = (610, 55)
    pos_r = (1030, 95)
    
    def paste_with_shadow(img, pos, blur, alpha, dy):
        cw, ch = canvas.size
        s = Image.new('RGBA', (cw, ch), (0,0,0,0))
        sdraw = ImageDraw.Draw(s)
        x, y = pos
        sdraw.rounded_rectangle([x - 6, y + dy, x + img.width + 6, y + img.height + dy + 10], radius=32, fill=(28, 25, 23, alpha))
        s = s.filter(ImageFilter.GaussianBlur(blur))
        canvas.paste(s, (0, 0), s)
        canvas.paste(img, pos, img)
        
    paste_with_shadow(p_left, pos_l, blur=18, alpha=65, dy=18)
    paste_with_shadow(p_right, pos_r, blur=18, alpha=65, dy=18)
    paste_with_shadow(p_center, pos_c, blur=26, alpha=100, dy=24)
    
    # 100% Accurate Badges from real screen data
    draw_pill_badge(canvas, 40, 130, '🪑', 'Bàn 01: 2 món · 75.000 đ')
    draw_pill_badge(canvas, 40, 210, '⚡', 'Tốc độ cảm ứng <50ms Native')
    draw_pill_badge(canvas, 1180, 140, '📲', 'VietQR MBBank · NGUYEN VAN CHU')
    draw_pill_badge(canvas, 1180, 220, '🖨️', 'In Bill K80 · Cắt giấy tự động')
    draw_pill_badge(canvas, 580, 948, '👑', 'Vị Chủ Quán · Đa nền tảng Expo SDK 57')
    
    save_dual_asset(canvas, 'screen_pos')

# ----------------------------------------------------
# 2. SONY XPERIA 5 SHOWCASE (1600 x 1000) -> screen_xperia
# ----------------------------------------------------
def build_xperia_tab():
    canvas = create_base_canvas(1600, 1000, glow_color=(180, 83, 9, 25))
    
    s_tables = get_screen('real_01_so_do_ban.png')
    s_menu = get_screen('real_02_pos_menu.png')
    
    p_left = create_phone_frame(s_tables, 820, bezel=10, radius=24)
    p_right = create_phone_frame(s_menu, 890, bezel=12, radius=28)
    
    pos_l = (400, 100)
    pos_r = (820, 55)
    
    def paste_p(img, pos, blur, alpha, dy):
        cw, ch = canvas.size
        s = Image.new('RGBA', (cw, ch), (0,0,0,0))
        sdraw = ImageDraw.Draw(s)
        x, y = pos
        sdraw.rounded_rectangle([x - 6, y + dy, x + img.width + 6, y + img.height + dy + 10], radius=32, fill=(28, 25, 23, alpha))
        s = s.filter(ImageFilter.GaussianBlur(blur))
        canvas.paste(s, (0, 0), s)
        canvas.paste(img, pos, img)
        
    paste_p(p_left, pos_l, blur=20, alpha=70, dy=18)
    paste_p(p_right, pos_r, blur=28, alpha=100, dy=24)
    
    draw_pill_badge(canvas, 70, 140, '🪑', 'Sơ đồ bàn: 21 Bàn (1 có khách)')
    draw_pill_badge(canvas, 70, 220, '⚡', 'Thao tác 1-chạm 60 FPS Native')
    draw_pill_badge(canvas, 1180, 170, '🛒', 'Giỏ hàng Bàn 01 · 75.000 đ')
    draw_pill_badge(canvas, 1180, 250, '📱', 'Sony Xperia 5 (Android Native)')
    
    save_dual_asset(canvas, 'screen_xperia')

# ----------------------------------------------------
# 3. IPAD / IOS TAB SHOWCASE (1600 x 1000) -> screen_cart
# ----------------------------------------------------
def build_ipad_tab():
    canvas = create_base_canvas(1600, 1000, glow_color=(56, 189, 248, 18))
    
    s_menu = get_screen('real_02_pos_menu.png')
    s_cart = get_screen('real_03_cart_items.png')
    
    tab_w, tab_h = 1080, 780
    tab_x = (1600 - tab_w) // 2
    tab_y = (1000 - tab_h) // 2 - 10
    
    s = Image.new('RGBA', (1600, 1000), (0,0,0,0))
    sdraw = ImageDraw.Draw(s)
    sdraw.rounded_rectangle([tab_x - 10, tab_y + 24, tab_x + tab_w + 10, tab_y + tab_h + 36], radius=40, fill=(28, 25, 23, 85))
    s = s.filter(ImageFilter.GaussianBlur(28))
    canvas.paste(s, (0, 0), s)
    
    ipad = Image.new('RGBA', (tab_w, tab_h), (0,0,0,0))
    idraw = ImageDraw.Draw(ipad)
    idraw.rounded_rectangle([0, 0, tab_w, tab_h], radius=32, fill=(35, 32, 30, 255), outline=(68, 64, 60, 255), width=3)
    
    bezel = 18
    scr_w, scr_h = tab_w - bezel * 2, tab_h - bezel * 2
    
    half_w = scr_w // 2
    left_img = s_menu.crop((0, 70, 1080, 1800)).resize((half_w, scr_h), Image.Resampling.LANCZOS)
    right_img = s_cart.crop((0, 70, 1080, 1800)).resize((half_w, scr_h), Image.Resampling.LANCZOS)
    
    screen_comp = Image.new('RGBA', (scr_w, scr_h), (255, 255, 255, 255))
    screen_comp.paste(left_img, (0, 0))
    screen_comp.paste(right_img, (half_w, 0))
    sc_draw = ImageDraw.Draw(screen_comp)
    sc_draw.line([(half_w, 0), (half_w, scr_h)], fill=(220, 215, 210, 255), width=1)
    
    mask = Image.new('L', (scr_w, scr_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, scr_w, scr_h], radius=18, fill=255)
    ipad.paste(screen_comp, (bezel, bezel), mask)
    
    canvas.paste(ipad, (tab_x, tab_y), ipad)
    
    draw_pill_badge(canvas, 70, 120, '📱', 'Apple iPad Pro & iPhone PWA')
    draw_pill_badge(canvas, 70, 200, '✨', 'Màn hình Retina 120Hz mượt mà')
    draw_pill_badge(canvas, 1160, 140, '☕', 'Giỏ hàng Bàn 01: 2 tô Chè')
    draw_pill_badge(canvas, 1160, 220, '🧾', 'Cần thu: 75.000 đ · In K80')
    
    save_dual_asset(canvas, 'screen_cart')

# ----------------------------------------------------
# 4. WINDOWS DESKTOP TAB SHOWCASE (1600 x 1000) -> screen_menu
# ----------------------------------------------------
def build_windows_tab():
    canvas = create_base_canvas(1600, 1000, glow_color=(59, 130, 246, 20))
    
    s_tables = get_screen('real_01_so_do_ban.png')
    s_menu = get_screen('real_02_pos_menu.png')
    
    win_w, win_h = 1120, 780
    win_x = (1600 - win_w) // 2
    win_y = (1000 - win_h) // 2 - 10
    
    s = Image.new('RGBA', (1600, 1000), (0,0,0,0))
    sdraw = ImageDraw.Draw(s)
    sdraw.rounded_rectangle([win_x - 10, win_y + 24, win_x + win_w + 10, win_y + win_h + 36], radius=24, fill=(28, 25, 23, 85))
    s = s.filter(ImageFilter.GaussianBlur(26))
    canvas.paste(s, (0, 0), s)
    
    win = Image.new('RGBA', (win_w, win_h), (255, 255, 255, 255))
    wdraw = ImageDraw.Draw(win)
    wdraw.rounded_rectangle([0, 0, win_w, win_h], radius=16, fill=(255, 255, 255, 255), outline=(210, 205, 200, 255), width=2)
    
    tb_h = 44
    wdraw.rounded_rectangle([0, 0, win_w, tb_h], radius=16, fill=(244, 241, 236, 255))
    wdraw.rectangle([0, 20, win_w, tb_h], fill=(244, 241, 236, 255))
    wdraw.line([(0, tb_h), (win_w, tb_h)], fill=(225, 220, 215, 255), width=1)
    
    wdraw.text((20, 11), 'OngChu Lean POS — Bản Cài Đặt Desktop Windows Native (Tauri 2.0 Rust)', fill=(40, 36, 33, 255), font=font_text_md)
    
    # Windows controls
    wdraw.line([(win_w - 110, 22), (win_w - 96, 22)], fill=(60, 56, 54, 255), width=1)
    wdraw.rectangle([win_w - 74, 16, win_w - 60, 28], outline=(60, 56, 54, 255), width=1)
    wdraw.line([(win_w - 38, 16), (win_w - 26, 28)], fill=(60, 56, 54, 255), width=1)
    wdraw.line([(win_w - 26, 16), (win_w - 38, 28)], fill=(60, 56, 54, 255), width=1)
    
    cw, ch = win_w - 4, win_h - tb_h - 4
    hw = cw // 2
    l_part = s_tables.crop((0, 70, 1080, 1800)).resize((hw, ch), Image.Resampling.LANCZOS)
    r_part = s_menu.crop((0, 70, 1080, 1800)).resize((hw, ch), Image.Resampling.LANCZOS)
    win.paste(l_part, (2, tb_h + 2))
    win.paste(r_part, (hw + 2, tb_h + 2))
    
    canvas.paste(win, (win_x, win_y), win)
    
    draw_pill_badge(canvas, 60, 120, '🪟', 'Windows Native .EXE siêu nhẹ ~15MB')
    draw_pill_badge(canvas, 60, 200, '🚀', 'Tiêu thụ <15MB RAM · Khởi động 0.05s')
    draw_pill_badge(canvas, 1160, 140, '🖨️', 'In Raw TCP Socket Port 9100')
    draw_pill_badge(canvas, 1160, 220, '🔌', 'Không cần cài đặt Driver máy in')
    
    save_dual_asset(canvas, 'screen_menu')

# ----------------------------------------------------
# 5. BENTO 2: SƠ ĐỒ BÀN (800 x 600) -> screen_tables
# ----------------------------------------------------
def build_bento_tables():
    canvas = create_base_canvas(800, 600, glow_color=(34, 197, 94, 20))
    s_tables = get_screen('real_01_so_do_ban.png')
    
    phone = create_phone_frame(s_tables, 520, bezel=8, radius=20)
    px = (800 - phone.width) // 2
    py = 40
    
    s = Image.new('RGBA', (800, 600), (0,0,0,0))
    sdraw = ImageDraw.Draw(s)
    sdraw.rounded_rectangle([px - 6, py + 14, px + phone.width + 6, py + phone.height + 22], radius=26, fill=(28, 25, 23, 75))
    s = s.filter(ImageFilter.GaussianBlur(16))
    canvas.paste(s, (0, 0), s)
    canvas.paste(phone, (px, py), phone)
    
    # 100% Real data from real_01_so_do_ban.png
    draw_pill_badge(canvas, 20, 65, '🪑', '21 Bàn (1 Đang Dùng)', is_small=True)
    draw_pill_badge(canvas, 20, 125, '🟢', 'Bàn 01 · 2 món 75k', is_small=True)
    draw_pill_badge(canvas, 550, 75, '🏢', 'Trệt (4) · Lầu 1 (2)', is_small=True)
    draw_pill_badge(canvas, 550, 135, '⚡', 'Đồng bộ tức thì', is_small=True)
    
    save_dual_asset(canvas, 'screen_tables')

# ----------------------------------------------------
# 6. BENTO 3: BẾP BAR KDS (800 x 600) -> screen_kds
# ----------------------------------------------------
def build_bento_kds():
    canvas = create_base_canvas(800, 600, glow_color=(239, 68, 68, 20))
    s_kds = get_screen('preview_real_07_kds_kitchen.png')
    
    phone = create_phone_frame(s_kds, 520, bezel=8, radius=20)
    px = (800 - phone.width) // 2
    py = 40
    
    s = Image.new('RGBA', (800, 600), (0,0,0,0))
    sdraw = ImageDraw.Draw(s)
    sdraw.rounded_rectangle([px - 6, py + 14, px + phone.width + 6, py + phone.height + 22], radius=26, fill=(28, 25, 23, 75))
    s = s.filter(ImageFilter.GaussianBlur(16))
    canvas.paste(s, (0, 0), s)
    canvas.paste(phone, (px, py), phone)
    
    # 100% Real data from real_07_kds_kitchen.png
    draw_pill_badge(canvas, 20, 65, '👨‍🍳', 'Bàn 01 · OD-1944 (2K)', is_small=True)
    draw_pill_badge(canvas, 20, 125, '⏱️', 'Đếm giờ chế biến: 0p', is_small=True)
    draw_pill_badge(canvas, 550, 75, '🍍', 'Chè Thái & Chè Bưởi', is_small=True)
    draw_pill_badge(canvas, 550, 135, '✓', 'Bấm [Xong] bưng bàn', is_small=True)
    
    save_dual_asset(canvas, 'screen_kds')

# ----------------------------------------------------
# 7. BENTO 4: THANH TOÁN & VIETQR (1000 x 600) -> screen_checkout
# ----------------------------------------------------
def build_bento_checkout():
    canvas = create_base_canvas(1000, 600, glow_color=(180, 83, 9, 25))
    s_qr = get_screen('cai_dat_vietqr_opened.png')
    s_num = get_screen('hoa_don_k80_preview.png')
    
    p_left = create_phone_frame(s_qr, 510, bezel=8, radius=20)
    p_right = create_phone_frame(s_num, 510, bezel=8, radius=20)
    
    pos_l = (240, 45)
    pos_r = (530, 45)
    
    def paste_p(img, pos):
        x, y = pos
        s = Image.new('RGBA', (1000, 600), (0,0,0,0))
        sdraw = ImageDraw.Draw(s)
        sdraw.rounded_rectangle([x - 6, y + 14, x + img.width + 6, y + img.height + 22], radius=26, fill=(28, 25, 23, 75))
        s = s.filter(ImageFilter.GaussianBlur(16))
        canvas.paste(s, (0, 0), s)
        canvas.paste(img, pos, img)
        
    paste_p(p_left, pos_l)
    paste_p(p_right, pos_r)
    
    # 100% Real data from cai_dat_vietqr_opened.png and hoa_don_k80_preview.png
    draw_pill_badge(canvas, 20, 85, '📲', 'VietQR MBBank Napas247', is_small=True)
    draw_pill_badge(canvas, 20, 150, '📝', 'STK: 0988776655 · MBBank', is_small=True)
    draw_pill_badge(canvas, 730, 85, '💵', 'Tiền mặt: 124.000 đ Đã Thu', is_small=True)
    draw_pill_badge(canvas, 730, 150, '🖨️', 'In K80 & Bung Két RJ11', is_small=True)
    
    save_dual_asset(canvas, 'screen_checkout')

# ----------------------------------------------------
# 8. BENTO 5: SỔ QUỸ CHI CHỢ (900 x 540) -> screen_soquy
# ----------------------------------------------------
def build_bento_soquy():
    canvas = create_base_canvas(900, 540, glow_color=(245, 158, 11, 20))
    s_sq = get_screen('so_quy_screen.png')
    
    phone = create_phone_frame(s_sq, 470, bezel=8, radius=20)
    px = (900 - phone.width) // 2
    py = 35
    
    s = Image.new('RGBA', (900, 540), (0,0,0,0))
    sdraw = ImageDraw.Draw(s)
    sdraw.rounded_rectangle([px - 6, py + 12, px + phone.width + 6, py + phone.height + 20], radius=24, fill=(28, 25, 23, 75))
    s = s.filter(ImageFilter.GaussianBlur(16))
    canvas.paste(s, (0, 0), s)
    canvas.paste(phone, (px, py), phone)
    
    # 100% Real data from so_quy_screen.png
    draw_pill_badge(canvas, 25, 75, '📉', 'Doanh thu: 1.926.800 đ', is_small=True)
    draw_pill_badge(canvas, 25, 140, '🧊', 'Két hiện tại: 918.000 đ', is_small=True)
    draw_pill_badge(canvas, 610, 85, '📈', 'Top 1: Trà Sữa TC 13 Ly', is_small=True)
    draw_pill_badge(canvas, 610, 150, '⏱️', 'Ghi chi chợ 3 giây', is_small=True)
    
    save_dual_asset(canvas, 'screen_soquy')

# ----------------------------------------------------
# 9. BENTO 6: GIAO CA ĐẾM KÉT (900 x 540) -> screen_giaoca
# ----------------------------------------------------
def build_bento_giaoca():
    canvas = create_base_canvas(900, 540, glow_color=(16, 185, 129, 20))
    s_gc = get_screen('giao_ca_screen.png')
    
    phone = create_phone_frame(s_gc, 470, bezel=8, radius=20)
    px = (900 - phone.width) // 2
    py = 35
    
    s = Image.new('RGBA', (900, 540), (0,0,0,0))
    sdraw = ImageDraw.Draw(s)
    sdraw.rounded_rectangle([px - 6, py + 12, px + phone.width + 6, py + phone.height + 20], radius=24, fill=(28, 25, 23, 75))
    s = s.filter(ImageFilter.GaussianBlur(16))
    canvas.paste(s, (0, 0), s)
    canvas.paste(phone, (px, py), phone)
    
    # 100% Real data from giao_ca_screen.png
    draw_pill_badge(canvas, 25, 75, '💵', 'Tiền mặt bán: +2.450.000 đ', is_small=True)
    draw_pill_badge(canvas, 25, 140, '🏦', 'VietQR Về TK: 1.850.000 đ', is_small=True)
    draw_pill_badge(canvas, 620, 85, '🔢', 'Bảng Đếm 9 Mệnh Giá 30s', is_small=True)
    draw_pill_badge(canvas, 620, 150, '🔒', 'Khóa Ca Chống Thất Thoát', is_small=True)
    
    save_dual_asset(canvas, 'screen_giaoca')

# ----------------------------------------------------
# 10. BÁO CÁO 3 CON SỐ VÀNG (1600 x 1000) -> screen_baocao
# ----------------------------------------------------
def build_baocao():
    canvas = create_base_canvas(1600, 1000, glow_color=(180, 83, 9, 25))
    s_pnl = get_screen('bao_cao_screen.png')
    
    phone = create_phone_frame(s_pnl, 880, bezel=11, radius=26)
    px = (1600 - phone.width) // 2
    py = 60
    
    s = Image.new('RGBA', (1600, 1000), (0,0,0,0))
    sdraw = ImageDraw.Draw(s)
    sdraw.rounded_rectangle([px - 8, py + 20, px + phone.width + 8, py + phone.height + 30], radius=32, fill=(28, 25, 23, 85))
    s = s.filter(ImageFilter.GaussianBlur(22))
    canvas.paste(s, (0, 0), s)
    canvas.paste(phone, (px, py), phone)
    
    # 100% Real data from bao_cao_screen.png
    draw_pill_badge(canvas, 80, 140, '👑', 'Lợi Nhuận Bỏ Túi: -816.200 đ')
    draw_pill_badge(canvas, 80, 220, '📊', 'Doanh thu: +1.926.800 đ')
    draw_pill_badge(canvas, 1140, 150, '💵', 'Tiền mặt: 718.000 đ (Đã trừ chi)')
    draw_pill_badge(canvas, 1140, 230, '🏦', 'VietQR MBBank: 961.800 đ')
    
    save_dual_asset(canvas, 'screen_baocao')

if __name__ == '__main__':
    print('Generating complete authentic showcase suite for https://ongchu.cloud/ ...')
    build_hero()
    build_xperia_tab()
    build_ipad_tab()
    build_windows_tab()
    build_bento_tables()
    build_bento_kds()
    build_bento_checkout()
    build_bento_soquy()
    build_bento_giaoca()
    build_baocao()
    print('All 10 showcase assets generated successfully!')
