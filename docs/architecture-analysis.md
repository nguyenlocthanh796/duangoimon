
# 🔬 PHÂN TÍCH KIẾN TRÚC & ROOT CAUSE — ONGCHU POS

> Bổ sung cho device-ui-test.md — Phân tích source code
> Thời gian: 2026-09-15 01:22-01:36 ICT

## 1. NAVIGATION ARCHITECTURE

Layout tree (expo-router Stack):
- index (POS — mobile-first, khong isWide guard)
- login, thanh-toan, cfd, kds, hoa-don, so-quy, giao-ca, bao-cao-loi-nhuan
- thuc-don, cai-dat, saas-admin, quan-ly-ban, kho-hang, nhan-su, khach-hang, huong-dan

VAN DE CHINH:
1. isWide=1024px qua thap -> Sony 1080px isWide=true -> Sidebar an + RailNav show
2. index.tsx thieu isWide guard -> BottomNavBar render unbeaten trong khi Sidebar an
3. AppRailNav khong co hamburger -> khong duong toi sidebar tren isWide device

## 2. DATA FLOW (DỮ LIỆU)

P&L (owner_pnl.go): today := time.Now().Truncate(24h) -> UTC BUG
- cash = Σ orders status=da_thanh_toan (GLOBAL, khong theo shift)
- vietqr = Σ orders payment_method IN (chuyen_khoan_vietqr, vietqr)
- cost = Σ TotalCostPrice + Σ cash_transactions type=chi

Giao Ca (shift.go): ExpectedEndingCash = StartingCash + CashSales + CashIn - CashOut
- TotalCashSales = Σ orders WHERE shift_id (SHIFT-LOCAL)
- TotalVietQRSales = Σ orders WHERE shift_id AND payment_method

KET LUAN: P&L scope tenant_id (global) + UTC; Giao Ca scope shift_id + VN -> so lieu lech


## BONUS: PHAT HIEN THEM TRONG SCAN (SECURITY)

### SEC-4: Master PIN backdoor hardcoded
- File: useAuthStore.ts L1190-1195 (verifyManagerPin)
- Logic: cleanPin === '8888' || cleanPin === '9999' -> isMaster = true
- Impact: Bat ky ai biet code -> bypass verifyManagerPin (void item, huy don, chiet khau >20%)
- Fix: Bo hardcode '8888', chi giu ownerPin tu config + backend verify

### SEC-5: SAAS Master Key default public
- File: useAuthStore.ts L171-180
- SAAS_MASTER_KEY_DEFAULT = 'ongchu_saas_master_root_key_202696febcef886f40d280e4a909a3a56085'
- isValidSaasMasterKey: chap nhan ANY 64-hex hoac 'ongchu_' prefix -> fake key de dang
- Impact: Super admin portal co the bi truy cap trai phep
- Fix: Chi chap nhan exact match default + config override

### XAC NHAN NAV-2 (KDS tab):
- checkRoutePermission: /kds duoc phep cho cashier (L111) + server (L117)
- => KDS tab dead KHONG do permission
- => Root cause: isWide=true (1080px) -> Sidebar an + BottomNavBar van render -> nav conflict


## XAC NHAN UX-2 (Nhan su empty state):
- File: useStaffStore.ts L94+ co INITIAL_STAFF seed day du (Nguyen Van An, Tran Thi Binh...)
- File: nhan-su/index.tsx L54 dung staffList truc tiep, KHONG filter branch
- Root cause: AsyncStorage persistence cu (stale) -> seed khong load lai
- Fix: bump persist version / migration / clear storage khi seed change

## KET LUAN CUOI:
Phat hien 5 security (SEC-1..5), 3 navigation (NAV-1..3), 4 data (DATA-1..4),
2 duplicate UI (UI-1..2), 3 UX (UX-1..3), 5 architecture (E1..5)
Tong cong 22 van de - khop voi device-ui-test.md 22 issues


======================================================================
## CORRECTIONS — VERIFIED BY LIVE DEVICE TEST (2026-09-15 01:45-02:01)
======================================================================
Sony Xperia 5 II (QV72022C31): 1080x2520 px @ 420dpi = 411dp width
=> isWide = (411 >= 1024) = FALSE. Device la MOBILE viewport.

### SAI — CAN RUT KHOI BAO CAO:
[NAV-1 SAI] isWide 1024px KHONG phai root cause. 411dp < 1024 -> isWide=false
  -> AppSidebar DUOC RENDER (showSidebar = !isWide && !isStandalone = true). OK.
[NAV-2 SAI] KDS tab khong phai isWide conflict.
  BottomNavBar guard: kds/index.tsx L935 {!isWide && <BottomNavBar activeTab=kds/>} OK.
[E3 SAI] Dead imports TabletCartPane/ProductCatalogPane/InlineModifierPane:
  -> DUOC DUNG THAT: index.tsx L859, L894, L914. XOA khoi bao cao.
[DATA-4 SAI] Order code format: device hien 'HD-260914-001' (DUNG chuan frontend).
  Backend order.go L57 mismatch chi anh huong khi goi API backend, khong phai UI.

### DUNG — XAC NHAN TU THIET BI:
[UI-1 CONFIRMED] Duplicate display bug THAT: So Don hien
  '1x Tra Chanh Mat Ong Gia Tay, 1x Tra Chanh Mat Ong Gia Tay, 2x Tra Chanh Mat...'
  => Cung 1 mon lap 3 lan tren 1 dong. Xac nhan display merge thieu.
[NAV OK] Hamburger HOAT DONG: 'Mo menu dieu huong' -> sidebar mo day du
  (So Do Ban, KDS, So HD, So Quy, Giao Ca, Khach Hang, CFD, Cai Dat...)
[NAV OK] Back key dong sidebar OK (BackHandler hoat dong)
[NAV OK] Deep link /hoa-don -> So Don OK
[NEW BUG] Sidebar nav tap KHONG navigate (5 lan tap: KDS item, backdrop, close, swipe
  -> sidebar van mo). Nhung Back key dong duoc. => Touch event tren sidebar overlay
  bi chan/anh huong tren Expo Go. Nghi: Animated.View native driver + uiautomator
  'could not get idle state' (animation lien tuc). CAN TEST THEM tren dev build.

### BOI CANH QUAN TRONG (truoc day bi hieu sai):
App khoi dong vao MAN PIN LOGIN ('Vao Ca Nhanh PIN', PIN pad 4 so, 'Thu Ngan dang ca').
PHai nhap PIN 2222 (nhan vien st_1 'Nguyen Van An' - Thu Ngan) moi vao duoc main POS.
=> Nhieu 'bug' device-test truoc la do test khi CHUA VAO CA. Staff PINs seed:
   st_1=2222 ThuNgan, st_2=2223, st_3=1111, st_4=8888, st_5=3333, st_6=4444


## CAP NHAT BANG CONG VIEC (quan trong cho execution):
### PHAT HIEN MOI TU DEVICE TEST (can xu ly):
[NEW-1] Sidebar nav tap khong navigate (touch bi chan) - test tren dev build rieng.
[NEW-2] Duplicate display: So Don hien mon lap (UI-1 THAT, khong phai chuyen de).
### CONFIRMED FIX LIST (giu nguyen - khong phu thuoc device):
SEC-1 webhook token, SEC-2 CORS, SEC-4 pin 8888, SEC-5 saas key,
DATA-1 timezone, DATA-3 shift not found, DATA-4 order code backend.

### NOTE: HD-260914-001 tren device = format moi (YYMMDD-NNN), khong phai UUID[:6].
=> Backend order.go L57 DANG LECH (tao HD-UUID[:6] khi tao qua API). Fix DATA-4 van dung.


## KET LUAN CUOI KDS NAVIGATION (2026-09-15 02:14 ICT)
- Deep link /kds tren Expo Go: KHONG navigate (app giu man hinh cu).
  /hoa-don cung chay am start VIEW nhu vay nhung va duoc (do lan dau app chua mount).
- Code KDS: screen OK (compile), route registered (Stack L251), permission OK (cashier/server/owner).
- Ket luan: KDS navigation can test tren DEV BUILD (expo run:android) - khong phai bug code.
- Expo Go am start VIEW chi ho tro lan dau; lan sau ignored (experience da mount).
- SE KHONG THE xac nhan them tren Expo Go; de lai cho dev build.
