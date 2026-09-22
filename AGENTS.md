# 👑 QUY TẮC TOÀN DỰ ÁN ONGCHU LEAN POS (AGENTS.md)
> **Hệ Thống POS F&B Thực Chiến — Cái Tâm Vị Chủ Quán — Đa Nền Tảng (Go Backend 15MB + Expo SDK 57 Native + Tauri 2.0 Desktop)**

Tài liệu này chứa **mọi quy chuẩn kỹ thuật bất biến** cho AI Agent và lập trình viên. Bắt buộc tuân thủ 100%.

---

## 🏛️ 1. 6 TRỤ CỘT KIẾN TRÚC BẤT BIẾN (CORE INVARIANTS)

| # | Trụ Cột | Chi Tiết Kỹ Thuật |
|---|---|---|
| **1** | **Vị Chủ Quán (Zero-Gov)** | Sổ quỹ chi chợ 3s (`/so-quy`), Giao ca đếm két 30s (`/giao-ca`), Báo cáo 3 con số vàng (`/bao-cao-loi-nhuan`), Telegram Bot Goroutine báo động gian lận. |
| **2** | **Backend Siêu Tốc (15MB)** | Golang 1.22+ Gin/Fiber (boot 0.05s), WebSocket Hub (`/ws/pos`) đồng bộ CFD & KDS, GORM Auto-Migrate PostgreSQL 16 & SQLite. |
| **3** | **In Nhiệt Direct ESC/POS** | Raw TCP Socket (Port 9100, không cần driver), mở két RJ11 `\x1b\x70\x00\x19\xfa`, tự cắt giấy `\x1d\x56\x41\x10`. |
| **4** | **Frontend Universal** | 1 Codebase Expo SDK 57 (iOS, Android, Web PWA), Zustand Multi-Table Cart (<1KB, Zero DOM lag), Shopify FlashList 60 FPS. |
| **5** | **Design System Dual-Theme** | Light (#F9F6F0 / #1C1917), Dark (#14110E / #1E1813), Accent (#B45309). Tabular Nums 100%, Typography 7 cấp (`xxs` đến `display`). |
| **6** | **Chống Gian Lận & Offline** | Bán hàng độc lập khi mất Internet, Audit Log lưu vết hủy món sau in tạm tính, cảnh báo chiết khấu > 20% và mở két tay. |

---

## 💻 2. CẤU TRÚC PHÂN HỆ & BẢNG CỔNG (PORT MATRIX)

| Phân Hệ | Thư Mục | Công Nghệ | Cổng | Nhiệm Vụ Trọng Tâm |
|---|---|---|---|---|
| **Frontend Mobile & Web** | `/frontend` | Expo SDK 57, RN 0.86.3, React 19, Zustand | `8085` | 10 Màn hình: `/`, `/thanh-toan`, `/kds`, `/hoa-don`, `/thuc-don`, `/cai-dat`, `/so-quy`, `/giao-ca`, `/bao-cao-loi-nhuan`, `/cfd` |
| **Golang Backend** | `/backend` | Go 1.22+, Gin, GORM, WebSocket | `8080` | REST APIs, WebSocket Broadcast, ESC/POS TCP Socket |
| **Database** | `docker-compose` | PostgreSQL 16 Alpine, Redis 7 | `5432` / `6379` | Sổ kế toán kép, Audit Logs, Caching |
| **Máy In Nhiệt ESC/POS** | Mạng LAN | TCP Raw Socket | `9100` | In hóa đơn K80/K58 trực tiếp, kích mở két tiền |
| **Desktop Wrapper** | `/desktop` | Tauri 2.0 (Rust Core) | N/A (`.exe`) | Windows Native siêu nhẹ (~10MB, ~15MB RAM) |
| **Android ADB Testing** | `/scripts` | Python JSON-RPC MCP Server | ADB Stdio | Kiểm thử thiết bị thật (Sony Xperia / Tablet) |

---

## 🎨 3. QUY CHUẨN FRONTEND & GIAO DIỆN (EXPO SDK 57)

### 3.1. Thang Đo Typography Chuẩn 7 Cấp (`<AppText>`)
BẮT BUỘC dùng `<AppText>`. CẤM hardcode `fontSize`/`lineHeight` inline.

| Cấp | Size / LineHeight | Phạm Vi Sử Dụng |
|---|---|---|
| **`xxs`** | `12px` / `16px` | In hóa đơn nhiệt preview K58/K80, modifier tag, barcode, wifi pass. |
| **`xs`** | `14px` / `20px` | SKU, ĐVT, Ngày giờ, Subtitle, Badge qty, Chip lọc, Trạng thái bàn. |
| **`sm`** | `16px` / `22px` | Chip Cấp 2 Capsule Pills (40-44pt), Nhãn tài chính dòng hóa đơn, CTA <= 3 chữ. |
| **`md`** | `18px` / `26px` | **POS BACKBONE 85-90% (CHUẨN THÔNG DỤNG)**: Tên món, Nhãn trường Form, Dòng dữ liệu chi tiết, Giá niêm yết, Dòng hóa đơn, Sổ quỹ, Đếm két, Drawer, Modal. |
| **`lg`** | `22px` / `28-32px` | **CHỈ DÙNG CHO TIÊU ĐỀ CHÍNH**: `<AppHeader>` title, Hero KPI Lợi Nhuận 3 Con Số Vàng. (CẤM dùng cho tên món hay card title bên trong thân bài). |
| **`xl`** | `28px` / `36px` | **Tổng tiền thanh toán giỏ hàng (Hero Action Amount)**. |
| **`display`** | `36px` / `44px` | **Phím số Numpad PIN Pad / Két tiền, KDS timer lớn, Màn hình phụ CFD cự ly xa**. |

- **Rules**: 
  - **Ưu tiên cỡ `md` (18px)** làm chuẩn thông dụng cho toàn bộ văn bản nội dung thân bài và dữ liệu.
  - **Tiêu đề / Nhãn trường / Card Header**: Dùng `variant="md"` kết hợp `weight="bold"` (in đậm rõ nét).
  - Font-weight trần `600` (De-bolding, CẤM font-weight 700/800). Tên món dài `numberOfLines={2}` `ellipsizeMode="tail"`. TextInput `fontSize >= 16px` (chống iOS WebKit auto-zoom). Form Mobile xếp 1 cột (`flexDirection: 'column'`). Android `includeFontPadding: false`.
- **Tabular Nums**: 100% số tiền, số lượng, mã đơn (`HD-xxxxx`), giờ (`14:30`) BẮT BUỘC `tabularNums={true}`.

### 3.2. Tokens Màu Dual-Theme & Nút Cam Apple Xuyên Suốt
Sử dụng `const { theme } = useTheme()`:

| Token | Light Mode (Giấy Dó) | Dark Mode (Cà Phê Rang) | Mục Đích Sử Dụng |
|---|---|---|---|
| `surface.app` | `#F9F6F0` (Ngà Giấy Dó) | `#14110E` (Nâu Than) | Nền chính ứng dụng (Anti-glare, chống mỏi mắt) |
| `surface.card` | `#FFFFFF` (Trắng Men Gốm) | `#1E1813` (Gỗ Gụ Trầm) | Nền Card, Sheet, Items |
| `text.primary` | `#1C1917` (Mực Gỗ Mun 15.8:1) | `#F3EFEA` (Ngà Giấy Dó 15.2:1) | Chữ chính, tên món, giá tiền |
| `text.muted` | `#44403C` (Xám Đá 8.5:1) | `#A8A29E` (Xám Mộc) | Phụ đề, nhãn phụ, icon inactive |
| `brand.primary` | `#1C1917` (Đen Gỗ Mun) | `#B45309` (Vàng Đồng Thau) | Thương hiệu & Nút Quản trị thứ cấp (`Lưu Ca`, `Lưu Phiếu`) |
| `brand.accent` | `#B45309` (Vàng Đồng Thau) | `#B45309` (Vàng Đồng Thau) | **Cam Apple Action Thread**, Tab Active, Qty Badge |
| `brand.success` | `#15803D` (Xanh Lá Mộc) | `#22C55E` (Xanh Non) | **CHỈ DÙNG** cho chấm trạng thái ● / icon ✓ (CẤM làm nền nút to) |
| `brand.danger` | `#DC2626` (Đỏ Chu Sa) | `#EF4444` (Đỏ Sơn Mài) | Hủy món, Xóa đơn, Cảnh báo |

- **Persistent Apple Warm Orange Action Thread**: 100% nút thanh toán/chốt tiền (Gọi món -> Giỏ hàng -> Nghiệp vụ bàn -> Hoàn tất thanh toán) BẮT BUỘC dùng màu Cam Apple `#B45309` (`theme.brand.accent`) chữ trắng `theme.text.onBrand`.

### 3.3. Responsive Layout & 2-Tier Navigation
- **Wide (`width >= 1024px`)**: `<AppRailNav>` 68px cố định bên trái + Hide Header Hamburger + Master-Detail 2 cột (60% / 40%).
- **Mobile (`width < 1024px`)**: 1 cột full-bleed + `MobileCartBar` + `BottomNavBar` 5-tab + Drawer `<AppSidebar>` (Floating overlay `position: absolute`, text `md` 18px zero-truncation + badges).
- **CFD (`/cfd`)**: Independent 16:9 / 4:3 view, KHÔNG navbar/sidebar.
- **2-Tier Nav dính dưới `<AppHeader>`**:
  - **Tier 1 (Underline Tabs 46px)**: Tab Cấp 1 dính trực tiếp dưới Header, nền Vàng Đồng Thau / Hổ Phách (`theme.status.warningBg`), active borderBottom 3px `#B45309`, text `md` (18px) `bold`/`medium`.
  - **Tier 2 (Capsule Pills 36px)**: Chip lọc Cấp 2, nền hòa 100% liền mạch cùng màu trắng danh sách bên dưới (`theme.surface.card`), duy trì 1 đường kẻ mảnh hairline (`borderBottomColor: theme.border.subtle`, `borderBottomWidth: StyleSheet.hairlineWidth`) với `paddingTop: 0` triệt tiêu 100% khe hở 3px. Active fill `#1C1917` hoặc `#B45309` chữ trắng, text `sm` (16px) `bold`/`medium`.

### 3.4. Component & Microcopy Invariants
1. **Header Contextual Action & zIndex**: 100% màn hình dùng `<AppHeader>`. `<AppHeader rightCustom>` tự đổi CTA theo tab (`+ Thêm Món`, `+ Thêm Nhóm`). CẤM tạo sub-bar phụ lặp lại. `AppHeader` chỉ đặt `zIndex: Platform.OS === 'web' ? 100 : undefined` để tránh tạo absolute overlay layer ảo che lấp vùng cuộn trên Android Native.
2. **Zero-Modal Detail & Inline Sub-Screen Branching**: 
   - CẤM dùng native `<Modal>` cho màn xem chi tiết hoặc form dài. Render Inline Sub-Screen hòa màu Status Bar, triệt tiêu vệt đen Navigation Bar Android OS (`#000000`).
   - **Bắt buộc phân nhánh unmount nền**: `itemFormVisible ? FORM : selectedItemDetail ? DETAIL : MAIN_LIST`. CẤM để màn hình chính mount bên dưới lớp phủ `StyleSheet.absoluteFill` (tránh lỗi xuyên thấu dữ liệu và giật lag trên Android).
3. **Phẳng Hóa Mobile Full-Bleed (De-boxing)**:
   - Trên Mobile (`< 1024px`), CẤM đóng khung hộp card (`borderRadius: 12`, `borderWidth: 1`, outer padding).
   - Toàn bộ nội dung trải rộng tràn viền trên nền phẳng `theme.surface.card`, phân tách khối bằng đường kẻ mảnh hairline (`borderBottomWidth: StyleSheet.hairlineWidth`, `borderBottomColor: theme.border.subtle`). Boxed card chỉ dùng trên Desktop (`isWide >= 1024px`).
4. **Bottom Dock Standard**: Height `48px`, font `<AppText variant="md" weight="bold">` (18px Bold, CẤM font `xs` 14px), icon 18-20px. Công thức safe inset đáy: `paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4`. Mobile cart dock 3 cụm: `[🛒 Qty] [📝 Lưu Đơn] [💵 Total (#B45309)]`.
5. **Touch Targets & Ergonomics**: Vùng chạm min **44 × 44pt**. Apple Circle Checkbox 26pt (radius 13pt). Filter pill height 40pt (scroll bar 54pt). CTA height 50-52pt. Dialog `maxHeight: '85-88%'` + `ScrollView flexShrink: 1` + 100% backdrop tap dismiss. Nút tác vụ bàn: `#FEF3C7` bg, `#B45309` border/text, height 44pt.
6. **Microcopy**: Nút CTA <= 3 chữ (`Tính Tiền`, `Báo Bếp`, `Xong & In Bill`, `Hết Món`). Toast <= 7 chữ (`Đã báo bếp Bàn 01`). Nhãn tiền <= 2 chữ (`Tiền thừa`, `Đưa đủ`).
7. **1-Touch Flow**: Tác vụ an toàn execute <= 50ms (no confirm popup). Tác vụ rủi ro (chiết khấu > 20%, hủy món) mở 1 reason modal -> Audit Log.
8. **Zero-Lag**: `@shopify/flash-list`, `expo-haptics`, 0ms Web Audio `playTapSound()`.

---

## ⚡ 4. BACKEND ENGINE (GOLANG GIN)

### 4.1. Clean Architecture Structure
```
backend/
├── cmd/server/main.go            # Init Gin Router, CORS, WS Hub, Routes
├── internal/
│   ├── config/config.go          # Env vars (PORT, DB, REDIS, JWT, VIETQR)
│   ├── database/database.go      # GORM PostgreSQL & AutoMigrate
│   ├── handler/                  # order, cash_flow, shift, owner_pnl, printer, cfd
│   ├── models/models.go          # GORM Data Models ACID
│   ├── service/telegram.go       # Anti-fraud Goroutine Telegram Bot
│   └── websocket/hub.go          # Thread-safe WS Hub
└── migrations/                   # DDL SQL Schema PostgreSQL 16
```

### 4.2. Cash Flow & 3 Golden Numbers P&L
- **`cash_transactions`**: Ghi nhận chi thực tế trong ngày (đá, rau, thịt, ứng lương).
- **Ca làm việc (`cash_shifts`)**: `expected_ending_cash = starting_cash + total_cash_sales + total_cash_in - total_cash_out`. Nếu `difference_amount != 0` -> Ghi Audit Log + Telegram Alert.
- **Báo cáo P&L (`/api/v1/owner/pnl-summary`)**:
  1. `cash_in_drawer` = `total_cash_sales - total_cash_expenses`.
  2. `vietqr_bank_total` = `total_vietqr_sales`.
  3. `real_net_profit` = `total_revenue - total_cost_of_goods - total_cash_expenses`.

---

## 🖨️ 5. MÁY IN NHIỆT ESC/POS & PHẦN CỨNG

- **TCP Raw Socket**: Direct `net.DialTimeout("tcp", printer_ip + ":9100", 3*time.Second)` (Không qua Windows Spooler / Driver).
- **Bảng Lệnh ESC/POS Hex**:

| Lệnh ESC/POS | Mã Hex Byte | Chức Năng |
|---|---|---|
| `ESC @` | `\x1B\x40` | Reset máy in |
| `ESC a 1` / `0` / `2` | `\x1B\x61\x01` / `\x00` / `\x02` | Căn lề Giữa / Trái / Phải |
| `GS ! 17` | `\x1D\x21\x11` | In hoa đậm + Ph phóng to x2 |
| `GS V 65 16` | `\x1D\x56\x41\x10` | Kích dao cắt giấy tự động (Auto-cutter) |
| `ESC p 0 25 250` | `\x1B\x70\x00\x19\xFA` | Xung 24V kích mở két tiền RJ11 |

---

## 🚨 6. CHỐNG GIAN LẬN NỘI BỘ (TELEGRAM BOT GOROUTINE)
Tự động gửi Telegram Alert cho Chủ Quán trong 4 trường hợp:
1. **Hủy món sau khi in tạm tính / gửi bếp**.
2. **Chiết khấu hóa đơn > 20%**.
3. **Mở két tiền bằng tay thủ công** (không qua đơn).
4. **Lệch tiền giao ca vượt ngưỡng**.

---

## 🛡️ 7. BẢO MẬT TOÀN DIỆN 4 VÀNH ĐAI (SECURITY HARDENING)
*(Xem chi tiết tại [SKILL.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-security-hardening/SKILL.md) & [security-hardening.md](file:///d:/duanpos-ongchu/.agents/rules/security-hardening.md))*

1. **Vành đai 1: Zero-Source Deployment**: Không bao giờ để mã nguồn `.go`/`.ts`/`.git` trên VPS Production. Chỉ chạy Stripped Binary Go (`-s -w -trimpath`) và Hermes Bytecode (`.hbc`) trên Mobile.
2. **Vành đai 2: Chống MITM & Ký số Request**: 100% TLS 1.3/HSTS, SSL Pinning SPKI Mobile, Ký số HMAC-SHA256 (`X-Signature`, `X-Timestamp`, `X-Nonce` TTL 30s chống Replay).
3. **Vành đai 3: Đóng băng VPS & Tường lửa**: SSH Ed25519 tắt password/root/đổi port, UFW Drop-all (chỉ mở 443/SSH), PostgreSQL & Redis cô lập trong Docker Network nội bộ (CẤM bind `0.0.0.0`), Fail2ban. **CẤM TUYỆT ĐỐI deploy file CSDL (`*.db*`, `*.sqlite*`, `data/`) từ máy local lên VPS**; CSDL VPS là dữ liệu thật (stateful), schema chỉ cập nhật qua GORM AutoMigrate.
4. **Vành đai 4: API & Chống Gian Lận**: Gin Rate Limiting Token Bucket, GORM Parameterized Query 100%, Audit Logs Append-Only + Telegram Alert tức thì.

---

## 🛠️ 8. RUNBOOK & TESTING

```bash
# 1. CSDL PostgreSQL & Redis:
docker-compose up -d

# 2. Golang Backend:
cd backend && go run cmd/server/main.go # Health: http://localhost:8080/health

# 3. Expo Frontend:
cd frontend && npm run dev # Expo: http://localhost:8085

# 4. ADB Testing Android:
python scripts/android_adb_mcp.py
# Note: Ưu tiên `adb_dump_ui`. Nếu screenshot tự nén 540px. CẤM view_file trên ảnh thô 1080p chưa nén.
```

---

## 🐎 9. PONYTAIL PRINCIPLES (LAZY SENIOR DEV)

- **Mode Active**: `full` (Mặc định mọi phiên chat).
- **Ponytail Decision Ladder**: 1) YAGNI -> 2) Tái sử dụng (`<AppText>`, `<AppHeader>`, `useTheme()`, Zustand, GORM) -> 3) Stdlib -> 4) Native Platform -> 5) Installed Dependency -> 6) 1 dòng -> 7) Code tối thiểu.
- **Root-Cause Fix**: Grep callers, fix tại gốc dùng chung, cấm vá triệu chứng ở từng nhánh gọi.
- **Non-Negotiables**: CẤM premature abstraction (no interface/factory thừa). Xóa code > thêm code. Giữ nguyên validation, an toàn tiền tệ, 7-scale typography, `tabularNums`, Dual-Theme, 1-touch.
- **Commands**: `/ponytail [lite|full|ultra]`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-help`.
