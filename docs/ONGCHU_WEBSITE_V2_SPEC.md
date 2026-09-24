# MASTER SPECIFICATION — ONGCHU WEBSITE V2 (https://ongchu.cloud/)

**Document:** `ONGCHU_WEBSITE_V2_SPEC.md`  
**Project:** OngChu POS Marketing Website  
**Version:** 2.0  
**Status:** Implementation Specification  

---

# 1. OBJECTIVE
Redesign the OngChu marketing website into a modern, trustworthy, high-performance F&B technology website.

The website must:
* Clearly explain what OngChu POS does.
* Show the actual product instead of relying on marketing claims.
* Help a restaurant/shop owner understand the workflow within seconds.
* Create trust around reliability, money management, inventory and operations.
* Work extremely well on mobile.
* Load quickly.
* Be accessible.
* Be SEO-friendly.
* Maintain existing functionality and URLs unless explicitly approved.
* Keep the marketing website independent from the POS application/backend.

The redesign is NOT a request to rewrite the POS application.

---

# 2. NON-GOALS
Do NOT:
* Rewrite the POS application.
* Change POS business logic.
* Change database schema.
* Change API contracts.
* Change authentication.
* Change payment processing.
* Change server infrastructure.
* Expose internal APIs.
* Expose environment variables.
* Expose secrets.
* Add unnecessary third-party services.
* Add fake product capabilities.
* Claim features that do not exist.
* Remove existing pages without verifying their usage.
* Break existing inbound links.

If any requirement appears to require backend/application changes:
STOP and report it before implementing.

---

# 3. FIRST STEP: REPOSITORY AUDIT
Before modifying any code, inspect the entire repository.
Determine:
1. Framework.
2. Build system.
3. Package manager.
4. Entry points.
5. Existing routes.
6. Existing components.
7. Existing CSS architecture.
8. Existing design system.
9. Existing assets.
10. Existing fonts.
11. Existing image optimization.
12. Existing SEO implementation.
13. Existing analytics.
14. Existing environment variables.
15. Existing deployment configuration.
16. Existing security headers.
17. Existing tests.
18. Existing lint/type checking.
19. Existing sitemap/robots configuration.
20. Existing external links.

Do NOT assume the repository structure described in this document is currently present.
Create: `docs/WEBSITE_AUDIT.md` before beginning major implementation.

---

# 4. CHANGE CONTROL
Every implementation must follow:
```text
AUDIT
↓
PLAN
↓
IMPLEMENT
↓
BUILD
↓
TEST
↓
AUDIT AGAIN
↓
REPORT
```

Never modify code first and inspect later.

---

# 5. BRAND DIRECTION
Visual personality:
* Modern, Premium, Practical, Trustworthy, Fast, Professional, F&B technology, Clean, Human.

Avoid:
* Excessive neon, gradients, glassmorphism, particle backgrounds, heavy 3D, giant decorative animations, excessive shadows, excessive rounded cards, stock photos, generic SaaS look, fake screenshots.

Primary principle:
> SHOW THE PRODUCT. DO NOT JUST TALK ABOUT THE PRODUCT.

---

# 6. INFORMATION ARCHITECTURE & SECTIONS
- **Global Header:** Sticky, responsive, keyboard accessible, CTA visible.
- **Hero Section:** Eyebrow `ONGCHU POS`, Headline `POS F&B thực chiến cho quán của bạn.`, Supporting copy, Dual CTA (`Vào bán hàng`, `Tải ứng dụng`), Hero visual with real mockup.
- **Trust Bar:** 6 capabilities (Offline-First, POS 60 FPS, KDS Báo Bếp, VietQR Động, Thu Chi Két, Báo Cáo 3 Con Số).
- **Problem → Solution:** 3 pillars (01 - TIỀN, 02 - HÀNG, 03 - VẬN HÀNH).
- **Workflow Section:** 8-step operational pipeline (`GỌI MÓN -> POS -> KDS -> CHẾ BIẾN -> THANH TOÁN -> SỔ QUỸ -> GIAO CA -> BÁO CÁO`).
- **Signature Section:** 3 Giây biết tình trạng, 30 Giây nắm doanh thu/két, 3 Con số vàng (Doanh thu, Chi phí, Lợi nhuận).
- **Feature Showcase:** Bento Grid with real screenshots (`assets/screen_pos.png`, `screen_tables.png`, `screen_kds.png`, `screen_checkout.png`, `screen_soquy.png`, `screen_giaoca.png`).
- **Offline-First:** Architectural comparison (Online vs Offline local SQLite flow).
- **Device Showcase:** Interactive tabs (Android Tablet/Phone, iPhone/iPad, Web Browser, Windows Desktop .EXE).
- **Solutions:** Industry contextual sections (Cafe, Trà sữa, Quán ăn, Nhà hàng).
- **FAQ:** Accessible accordion with 10 fact-checked questions.
- **Final CTA:** "QUẢN LÝ QUÁN NHẸ ĐẦU HƠN".
- **Global Footer:** Semantic, contact info, privacy link, e-receipt lookup link, copyright.
- **Design Tokens:** 10 centralized token groups in CSS.
- **SEO & Accessibility:** Structured Data Schema.org, WCAG 2.2 AA compliance, Core Web Vitals targets (LCP < 2.5s, CLS < 0.1, INP < 200ms).
