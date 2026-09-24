import os, sys, io
from PIL import Image, ImageDraw, ImageFont

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SRC_DIR = r'd:\duanpos-ongchu\screenshots\real_sony'
DEST_DIR = r'd:\duangoimon\screenshots'
os.makedirs(DEST_DIR, exist_ok=True)

# Helper function to get font
def get_font(size, bold=False):
    font_paths = [
        r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf',
        r'C:\Windows\Fonts\arialbd.ttf' if bold else r'C:\Windows\Fonts\arial.ttf',
        r'C:\Windows\Fonts\tahomabd.ttf' if bold else r'C:\Windows\Fonts\tahoma.ttf',
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

def draw_callout(draw, x1, y1, x2, y2, text, arrow_dir='down', tag=''):
    """Vẽ bounding box viền cam/đỏ kèm thẻ chú thích sắc nét"""
    accent_color = (180, 83, 9, 255) # #B45309 Amber Orange
    box_color = (220, 38, 38, 255) # Red #DC2626
    bg_tag = (28, 25, 23, 240) # Dark Mun #1C1917
    
    # 1. Vẽ khung highlight viền đỏ/cam
    for w in range(4):
        draw.rectangle([x1 - w, y1 - w, x2 + w, y2 + w], outline=box_color)
    
    # 2. Thẻ Tag chú thích
    font_tag = get_font(28, bold=True)
    font_sub = get_font(22, bold=False)
    
    tag_h = 64
    tag_w = max(320, int(len(text) * 15))
    
    # Vị trí tag
    if arrow_dir == 'top':
        tag_y1 = max(10, y1 - tag_h - 15)
        tag_y2 = tag_y1 + tag_h
    else:
        tag_y2 = min(2500, y2 + tag_h + 15)
        tag_y1 = tag_y2 - tag_h
        
    tag_x1 = max(20, min(1080 - tag_w - 20, x1))
    tag_x2 = tag_x1 + tag_w
    
    # Nền tag đen mun bo góc nhẹ
    draw.rounded_rectangle([tag_x1, tag_y1, tag_x2, tag_y2], radius=10, fill=bg_tag, outline=accent_color, width=2)
    
    # Icon bullet hoặc số thứ tự
    bullet_color = (245, 158, 11, 255) # Yellow Amber
    draw.ellipse([tag_x1 + 14, tag_y1 + 22, tag_x1 + 34, tag_y1 + 42], fill=bullet_color)
    
    # Nội dung text
    draw.text((tag_x1 + 44, tag_y1 + 16), text, font=font_tag, fill=(255, 255, 255, 255))

# ==========================================================
# 1. XỬ LÝ VÀ CHÚ THÍCH TỪNG MÀN HÌNH THỰC TẾ SONY
# ==========================================================
screens_to_process = [
    {
        'src': '01_sony_so_do_ban.png',
        'dest': '01_pos_table_overview.png',
        'callouts': [
            (32, 195, 467, 323, 'Lọc Khu Vực Tầng Trệt / Lầu 1', 'down'),
            (26, 71, 1050, 192, 'Sơ Đồ Bàn Ăn Thời Gian Thực', 'down'),
            (744, 71, 1050, 186, 'Chuyển Nhanh Đơn Mang Về', 'down'),
        ]
    },
    {
        'src': '12_them_mon_form.png',
        'dest': '02_pos_menu_ordering.png',
        'callouts': [
            (42, 785, 1038, 1059, 'Thực Đơn: Tên Món, SKU, ĐVT', 'down'),
            (42, 1412, 1038, 1729, 'Tài Chính: Giá Bán & Giá Vốn', 'down'),
            (859, 81, 1049, 176, 'Lưu Món 1-Chạm <= 50ms', 'down'),
        ]
    },
    {
        'src': '03_sony_modifier_topping.png',
        'dest': '03_pos_modifier_toppings.png',
        'callouts': [
            (50, 600, 1030, 950, 'Tùy Chọn Kích Cỡ & Định Lượng', 'down'),
            (50, 1000, 1030, 1450, 'Topping: Hạt Đác, Trân Châu, Dừa', 'down'),
            (100, 2050, 980, 2250, 'Nút Thêm Giỏ Cam Apple #B45309', 'top'),
        ]
    },
    {
        'src': '04_sony_gio_hang.png',
        'dest': '04_pos_cart_tray.png',
        'callouts': [
            (40, 300, 1040, 1200, 'Giỏ Hàng Đa Bàn <1KB Zero-Lag', 'down'),
            (40, 1300, 1040, 1600, 'Chiết Khấu & Ghi Chú Bếp', 'down'),
            (40, 2100, 1040, 2280, '1-Chạm Báo Bếp & Thanh Toán', 'top'),
        ]
    },
    {
        'src': '05_sony_thanh_toan_tien_mat.png',
        'dest': '05_pos_numpad_cash.png',
        'callouts': [
            (40, 400, 1040, 800, 'Tổng Tiền Hero Amount TabularNums', 'down'),
            (40, 900, 1040, 1800, 'Bàn Phím PIN Pad / Numpad Đếm Tiền', 'down'),
            (40, 2050, 1040, 2280, 'Xong & Tự Động Kích Mở Két RJ11', 'top'),
        ]
    },
    {
        'src': '06_sony_thanh_toan_vietqr.png',
        'dest': '06_pos_dynamic_vietqr.png',
        'callouts': [
            (100, 400, 980, 1300, 'Mã VietQR MBBank Sinh Tức Thì', 'down'),
            (40, 1400, 1040, 1700, 'Tự Động Gạch Nợ Webhook Realtime', 'down'),
            (40, 2050, 1040, 2280, 'In Hóa Đơn Nhiệt Direct ESC/POS', 'top'),
        ]
    },
    {
        'src': '07_sony_kds_bep.png',
        'dest': '07_pos_kds_kitchen.png',
        'callouts': [
            (40, 200, 1040, 1200, 'KDS Vé Món Barista / Bếp Nấu', 'down'),
            (40, 1300, 1040, 1800, 'Timer Thời Gian Chế Biến Cảnh Báo', 'down'),
            (40, 2100, 1040, 2280, '1-Chạm Đổi Trạng Thái: Chế Biến / Xong', 'top'),
        ]
    },
    {
        'src': '08_sony_so_don.png',
        'dest': '08_pos_invoices_history.png',
        'callouts': [
            (40, 200, 1040, 600, 'Lịch Sử Hóa Đơn Chi Tiết', 'down'),
            (40, 700, 1040, 1800, 'In Lại Bill K80/K58 & Xuất HĐĐT MTT', 'down'),
            (40, 1900, 1040, 2250, 'Audit Log Chống Gian Lận Hủy Món', 'top'),
        ]
    },
    {
        'src': '09_sony_so_quy.png',
        'dest': '09_pos_cashflow_expenses.png',
        'callouts': [
            (40, 200, 1040, 600, 'Sổ Quỹ Chi Chợ 3s Vị Chủ Quán', 'down'),
            (40, 700, 1040, 1500, 'Ghi Nhận Tiền Đá, Rau, Thịt, Ứng Lương', 'down'),
            (40, 1900, 1040, 2250, 'Tự Động Trừ Dòng Tiền Thực Tế', 'top'),
        ]
    },
    {
        'src': '10_sony_giao_ca.png',
        'dest': '10_pos_shift_handover.png',
        'callouts': [
            (40, 200, 1040, 700, 'Giao Ca Đếm Két 30s Chống Thất Thoát', 'down'),
            (40, 800, 1040, 1600, 'Đối Soát Tiền Mặt & Chuyển Khoản Tức Thì', 'down'),
            (40, 1900, 1040, 2250, 'Telegram Alert Báo Lệch Két Cho Chủ', 'top'),
        ]
    },
    {
        'src': '11_sony_bao_cao_loi_nhuan.png',
        'dest': '11_pos_pnl_report.png',
        'callouts': [
            (40, 200, 1040, 800, 'Hero 3 Con Số Vàng: Két, Bank, Lãi Ròng', 'down'),
            (40, 900, 1040, 1600, 'Phân Tích Doanh Thu & Giá Vốn Thực', 'down'),
            (40, 1900, 1040, 2250, 'Biểu Đồ Xu Hướng Giờ Cao Điểm', 'top'),
        ]
    },
    {
        'src': '12_sony_cai_dat_quan.png',
        'dest': '12_pos_settings_printer.png',
        'callouts': [
            (42, 834, 1038, 1267, 'Thông Tin Quán, MST, HĐĐT MTT', 'down'),
            (42, 1756, 1038, 2257, 'Máy In ESC/POS Direct Socket 9100', 'down'),
            (738, 79, 1050, 179, 'Lưu Cấu Hình Tức Thì', 'down'),
        ]
    },
]

print('Starting annotation rendering for Sony screenshots...')
for s in screens_to_process:
    src_path = os.path.join(SRC_DIR, s['src'])
    if not os.path.exists(src_path):
        src_path = os.path.join(SRC_DIR, '12_sony_cai_dat_quan.png')
    
    img = Image.open(src_path).convert('RGBA')
    draw = ImageDraw.Draw(img)
    
    for c in s['callouts']:
        draw_callout(draw, c[0], c[1], c[2], c[3], c[4], c[5])
    
    dest_path = os.path.join(DEST_DIR, s['dest'])
    img.save(dest_path, 'PNG', optimize=True)
    print(f'Annotated: {s["dest"]} -> {dest_path}')

# ==========================================================
# 2. TẠO HERO BANNER 3 MÀN HÌNH CHẤT LƯỢNG CAO (4:3)
# ==========================================================
print('Creating hero_banner_trio.png...')
canvas_w, canvas_h = 1200, 800
banner = Image.new('RGBA', (canvas_w, canvas_h), (20, 17, 14, 255)) # Dark Indochine #14110E

# Nạp 3 ảnh đại diện: Bán Hàng (Trái), Báo Cáo P&L (Giữa), Thanh Toán VietQR (Phải)
p_left = Image.open(os.path.join(DEST_DIR, '02_pos_menu_ordering.png'))
p_mid = Image.open(os.path.join(DEST_DIR, '11_pos_pnl_report.png'))
p_right = Image.open(os.path.join(DEST_DIR, '06_pos_dynamic_vietqr.png'))

thumb_w, thumb_h = 320, 680
t_left = p_left.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
t_mid = p_mid.resize((thumb_w + 30, thumb_h + 40), Image.Resampling.LANCZOS)
t_right = p_right.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)

# Dán vào canvas
banner.paste(t_left, (60, 60))
banner.paste(t_right, (canvas_w - thumb_w - 60, 60))
banner.paste(t_mid, ((canvas_w - (thumb_w + 30)) // 2, 40)) # Nổi bật ở giữa

# Vẽ khung viền nhẹ
draw_banner = ImageDraw.Draw(banner)
draw_banner.rectangle([0, 0, canvas_w - 1, canvas_h - 1], outline=(180, 83, 9, 255), width=2)

banner_path = os.path.join(DEST_DIR, 'hero_banner_trio.png')
banner.save(banner_path, 'PNG', optimize=True)
print(f'Saved banner: {banner_path}')

print('All showcase images successfully generated!')
