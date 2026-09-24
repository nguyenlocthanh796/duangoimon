# BÁO CÁO KIỂM TOÁN HỆ THỐNG WEBSITE MARKETING ONGCHU (WEBSITE_AUDIT.md)
> **Dự Án:** OngChu POS Marketing Website (`https://ongchu.cloud/`)  
> **Phiên Bản Hiện Tại:** 1.0 (Audit Baseline) ➔ Mục tiêu: 2.0 (Master Spec)  
> **Thời Điểm Kiểm Toán:** 2026-09-23  
> **Chuẩn Mực Thực Hiện:** Zero-Assumptions, Evidence-First, Ponytail Compliant  

---

## 1. TECH STACK
- **Công nghệ cốt lõi:** Pure HTML5 / CSS3 / Vanilla JavaScript ES6+ (Zero-Framework, Static Web Architecture).
- **Hệ thống Build / Đóng gói:** Zero-bundler (Direct Static Serving qua Nginx). Không phụ thuộc Webpack/Vite/Rollup đối với phân hệ Landing, giúp tốc độ phục vụ đạt cực đại và không có hydration overhead.
- **Package Manager:** Không sử dụng NPM package nội bộ trong thư mục `landing/` (Toàn bộ là native web APIs). Các dependencies công cụ nằm ở thư mục root (`python`, `paramiko`).
- **Phông chữ:** Web Font Google Fonts `Plus Jakarta Sans` (Weights: 400, 500, 600, 700) nạp bất đồng bộ qua `preconnect`.
- **Môi trường phục vụ:** Nginx 1.24+ trên Ubuntu 22.04 LTS VPS (`116.118.3.48`), SSL TLS 1.3 Let's Encrypt HTTP/2.

---

## 2. ARCHITECTURE
- **Thư mục mã nguồn:** `d:/duanpos-ongchu/landing/`
- **Mô hình triển khai:** Tách biệt độc lập 100% với ứng dụng POS (`/frontend` chạy Expo Web PWA tại `https://app.ongchu.cloud/`) và Backend (`/backend` chạy Golang Gin tại `127.0.0.1:8080`).
- **Đường dẫn thư mục tĩnh trên VPS:**
  - `/var/www/ongchu-landing` (Phục vụ domain chính `https://ongchu.cloud/`)
  - `/var/www/posgit/frontend/dist/landing` (Mirror dự phòng)
- **Cơ chế Reverse Proxy:** Nginx định tuyến các request tra cứu hóa đơn điện tử công khai (`/b/`, `/bill/`, `/tra-cuu`, `/api/`) sang Go Backend, còn lại toàn bộ trang tĩnh và tài sản số được Nginx phục vụ trực tiếp từ ổ đĩa NVMe.

---

## 3. ROUTES & URL INVENTORY
Hiện tại hệ thống có 4 route chính thống được khai báo trong `sitemap.xml` và hỗ trợ URL rewrite không đuôi `.html`:
1. `/` (`index.html`): Trang chủ giới thiệu toàn diện giải pháp OngChu POS, bảng tính năng, bảng giá 0đ, modal tải app.
2. `/cafe.html` hoặc `/cafe` (`cafe.html`): Trang giải pháp chuyên sâu cho quán Cafe & Trà Sữa (Menu size/topping, in bill quầy, mã QR bàn).
3. `/quan-an.html` hoặc `/quan-an` (`quan-an.html`): Trang giải pháp chuyên sâu cho Quán Ăn, Quán Nhậu & Nhà Hàng (Báo bếp KDS, sơ đồ bàn, gộp/tách bàn).
4. `/privacy.html` hoặc `/privacy` (`privacy.html`): Chính sách bảo mật dữ liệu và quyền riêng tư theo tiêu chuẩn Google Play & Apple App Store.
5. `/tra-cuu` & `/b/:code`: Cổng tra cứu hóa đơn điện tử e-Receipt (Do Go Backend xử lý giao diện).

---

## 4. COMPONENT SYSTEM
Hiện tại giao diện đang sử dụng cấu trúc HTML Semantic lặp lại theo trang, chưa có templating engine:
- **Global Header:** `<header class="site-header">` với logo, nav links (`Giải pháp`, `Tính năng`, `Tải App`), CTA Button "Vào POS Ngay" (`https://app.ongchu.cloud/`).
- **Mobile Navigation Drawer:** `<div id="mobile-drawer">` + `<div id="mobile-drawer-backdrop">` hỗ trợ trượt từ phải sang với nút đóng.
- **Hero Section:** Tiêu đề H1, Supporting Copy, Group CTA đôi (`Vào Bán Hàng Ngay` + `Tải Ứng Dụng`), Visual Mockup khung iPad/Tablet hiển thị màn hình bán hàng thực tế.
- **Trust Indicators / Value Props:** Thẻ 3 con số (3s, 30s, 3 số vàng).
- **Feature Showcase / Bento Grid:** Thẻ tính năng (Offline-First, In nhiệt TCP 9100, Báo bếp KDS, Sổ quỹ chi chợ, Giao ca 30s).
- **Interactive Modals:** Modal tải ứng dụng (`#download-modal`) hỗ trợ tab Android APK, Windows EXE, iOS PWA/TestFlight.
- **Global Footer:** 4 cột phân nhóm liên kết, thông tin pháp lý, bản quyền, link chính sách bảo mật, hỗ trợ Zalo/Hotline.

---

## 5. STYLING SYSTEM (DESIGN TOKENS)
Toàn bộ style nằm tại `landing/styles.css` (983 dòng, 20.1KB).
- **Design Language:** Warm Light Modern Minimalist (Giấy Dó Indochine & Trắng Men Gốm, lấy cảm hứng từ Claude/Gemini canvas).
- **Tokens cốt lõi (`:root`):**
  - Background: `--bg-page: #FAF8F5`, `--bg-card: #FFFFFF`, `--bg-subtle: #F3EFEA`.
  - Typography: `--text-primary: #1C1917`, `--text-secondary: #44403C`, `--text-muted: #78716C`.
  - Action/Accent: `--accent-primary: #B45309` (Cam Apple Warm Action Thread), `--accent-light: #FEF3C7`.
  - Border: `--border-subtle: #EAE6DF`, `--border-default: #E2DDD5`.
  - Container: `--max-width: 1080px`.
- **Đánh giá:** Hệ thống token hiện tại rất chuẩn mực và đồng bộ với Design System của ứng dụng POS (`AGENTS.md`). Tuy nhiên, cần chuẩn hóa lại các biến thành nhóm token thống nhất cho Website V2 theo mục 27 Master Spec.

---

## 6. ASSETS & MULTIMEDIA INVENTORY
Thư mục `landing/assets/` chứa 13 tệp (tổng dung lượng ~5.4MB):
- **Brand Identity:** `icon.png` (154KB), `logo.png` (154KB).
- **Product Screenshots (Chụp màn hình thật 100% từ ứng dụng):**
  - `screen_pos.png` (530KB) - Màn hình bán hàng chính POS.
  - `screen_tables.png` (310KB) - Sơ đồ bàn trực quan.
  - `screen_cart.png` (254KB) - Giỏ hàng và tùy chọn món.
  - `screen_checkout.png` (406KB) - Thanh toán đa phương thức & VietQR.
  - `screen_kds.png` (278KB) - Màn hình điều phối chế biến Bếp/Bar.
  - `screen_soquy.png` (233KB) - Sổ quỹ chi chợ thực chiến.
  - `screen_giaoca.png` (173KB) - Giao ca kiểm đếm két 30s.
  - `screen_baocao.png` (214KB) - Báo cáo lợi nhuận 3 con số vàng.
  - `screen_menu.png` (617KB) - Quản lý thực đơn & danh mục.
  - `screen_xperia.png` (1.92MB) - Ảnh thiết bị thật Sony Xperia Compact.
  - `x_promo_banner.jpg` (448KB) - Banner truyền thông.
- **Thư mục Downloads (`landing/downloads/`):**
  - `ongchu-pos-desktop.exe` (15.6MB - Bản Windows Native Tauri 2.0).
  - `version.json` (1.2KB - Thông tin phiên bản desktop cập nhật tự động).
  - `manifest.plist` (960B - Bản phân phối iOS nội bộ).
- **Hiện trạng tối ưu hóa:** Toàn bộ ảnh hiện là PNG/JPG gốc. Chưa có định dạng WebP/AVIF để tối ưu LCP và tiết kiệm băng thông di động.

---

## 7. SEO & LLM INTEGRATION
- **Tình trạng:** Cực kỳ tốt (Đạt 57/57 tiêu chuẩn kiểm toán tự động qua `audit_seo_integrity.py`).
- **Thẻ Meta & OpenGraph:** Đầy đủ 100% `title`, `description`, `canonical`, `og:*`, `twitter:*`.
- **Cấu trúc dữ liệu JSON-LD:** Đã khai báo `SoftwareApplication`, `Organization`, `WebSite`, `FAQPage`.
- **Sitemap & Robots:** `sitemap.xml` chuẩn W3C, `robots.txt` tối ưu cho bot truyền thống và cả AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).
- **AI Ready:** Đã trang bị tệp `llms.txt` (7.2KB) chuẩn hóa dữ liệu ngữ cảnh cho các mô hình AI/LLM tra cứu.

---

## 8. ANALYTICS & EVENT TRACKING
- **Hiện trạng:** Zero third-party tracker (Không gắn Google Analytics / Facebook Pixel nặng nề).
- **Tương tác UI:** Toàn bộ sự kiện mở modal, đóng drawer, chuyển tab xử lý cục bộ bằng JavaScript thuần (`app.js`, 67 dòng, 2.2KB).
- **Cần bổ sung:** Cấu hình Custom Event tracking nội bộ hoặc privacy-friendly telemetry để đo lường tỷ lệ nhấp nút `Vào bán hàng`, tải file EXE/APK và chuyển đổi theo mục 37 Spec.

---

## 9. SECURITY BASELINE
- **Giao thức:** 100% HTTPS TLS 1.2 / 1.3 với HSTS `max-age=31536000`.
- **Secrets Audit:** Working tree hoàn toàn sạch 100%, không hardcode API key, password hay secret trong tệp frontend/landing.
- **Separation of Concerns:** Landing page là static pure HTML, không có quyền truy cập trực tiếp vào DB hoặc biến môi trường nội bộ của VPS.

---

## 10. PERFORMANCE & CORE WEB VITALS BASELINE
- **LCP (Largest Contentful Paint):** Hiện tại phụ thuộc vào ảnh `screen_pos.png` (530KB). Đang tải nhanh nhưng cần chuyển đổi sang WebP để giảm xuống < 100KB.
- **CLS (Cumulative Layout Shift):** Bằng `0.000` do toàn bộ ảnh đã được set thuộc tính `width` và `height` tường minh trong HTML.
- **INP / FID:** Cực tốt (< 10ms) do không có JavaScript framework chạy hydration.

---

## 11. ACCESSIBILITY (A11Y)
- **Điểm mạnh:** Cấu trúc thẻ HTML có ngữ nghĩa (`header`, `main`, `section`, `footer`), tỉ lệ tương phản chữ cao (Mực mun trên ngà giấy dó đạt > 15:1).
- **Điểm cần nâng cấp:** Cần bổ sung `aria-expanded`, `aria-controls` cho Mobile Drawer Hamburger, bẫy tiêu điểm (Focus Trap) trong Modal, hỗ trợ phím điều hướng tab thiết bị.

---

## 12. TESTING & QUALITY ASSURANCE
- **Công cụ hiện có:** `landing/audit_seo_integrity.py` (Script Python chuẩn thư viện stdlib kiểm tra 57 tiêu chí SEO, JSON-LD, kích thước ảnh, sự tồn tại của tệp tài sản vật lý).
- **Kiểm thử thủ công:** Đã kiểm tra tương thích trình duyệt Safari, Chrome, Edge và giao diện di động.

---

## 13. DEPLOYMENT PIPELINE
- **Script triển khai:** `scripts/deploy_landing.py` (Paramiko SFTP an toàn, fail-closed khi thiếu biến môi trường, tự động đồng bộ `/var/www/ongchu-landing` và reload Nginx).
- **Thời gian deploy:** ~5 - 8 giây qua SSH.

---

## 14. RISKS & GAPS SO VỚI MASTER SPEC V2
1. **Thiếu một số khối nội dung quan trọng theo Spec V2:**
   - Chưa có section trực quan minh họa rõ ràng luồng nghiệp vụ khép kín 8 bước (`GỌI MÓN -> POS -> KDS -> CHẾ BIẾN -> THANH TOÁN -> SỔ QUỸ -> GIAO CA -> BÁO CÁO`).
   - Chưa có khối so sánh trực quan Online vs Offline-First.
   - Device Showcase hiện tại mới ở dạng Modal tải về, chưa có dạng Interactive Tabs trực tiếp trên trang để khách hàng thấy trải nghiệm đa nền tảng (Android, iOS/iPad, Web, Windows).
   - Phần Bento Grid tính năng cần tái cấu trúc tinh gọn hơn, gắn liền ảnh chụp màn hình thật của từng phân hệ (Bàn, Món, Bếp, Tiền, Kho).
2. **Định dạng ảnh:** Cần bổ sung các phiên bản WebP cho 11 ảnh chụp màn hình để tối ưu hóa tải trang trên mạng 3G/4G di động.

---

## 15. KHUYẾN NGHỊ THỰC THI (RECOMMENDATIONS)
1. **Giữ nguyên nền tảng Pure HTML5/CSS/JS:** Không đưa React/Vue/Next.js vào landing page. Giữ nguyên kiến trúc siêu nhẹ, tải trang tức thì, zero build step.
2. **Chuẩn hóa Design Tokens CSS:** Mở rộng `landing/styles.css` đáp ứng đầy đủ 10 nhóm token theo Mục 27 Spec.
3. **Nâng cấp `index.html` thành Showroom Sản Phẩm:** Tái thiết kế trang chủ thành một "Phòng trưng bày giải pháp F&B thực chiến", phô diễn tối đa các màn hình thật đã có sẵn trong `landing/assets/`.
4. **Bảo toàn 100% SEO & URLs hiện có:** Không làm thay đổi cấu trúc URL, giữ nguyên các trang `/cafe.html`, `/quan-an.html`, `/privacy.html`, đảm bảo `audit_seo_integrity.py` đạt 57/57 PASS.
