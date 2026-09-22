# Dispatch Log

## 2026-09-16T10:20:42Z
**From**: Parent Agent (28ce6701-7c02-457f-9417-9e55421b00f6)
**Target**: Project Orchestrator (orchestrator_1)
**User Request**:
Kiểm duyệt, rà soát và chuẩn hóa 100% các thành phần giao diện, màn hình và component trên frontend Expo SDK 52 của dự án `duanpos-ongchu`, xóa bỏ toàn bộ mã màu hardcode cũ (Slate, Jade, Orange), đồng bộ sang hệ thống token Indochine Heritage (Ngà Giấy Dó, Mực Gỗ Mun, Đồng Thau, Men Gốm, Xanh Lá Mộc, Đỏ Chu Sa), tuân thủ nghiêm ngặt Apple HIG và Typography 7 cấp.

Key Requirements:
- R1. Triệt Tiêu Hardcode Màu Cũ & Áp Dụng Chuẩn Token Indochine (`theme.surface.app`, `theme.text.primary`, `theme.text.muted`, `theme.border.subtle`, `theme.brand.accent`, `theme.brand.success`, `theme.brand.danger`).
- R2. Chuẩn Hóa Hệ Thống 2 Dãy Điều Hướng & Nút Bấm Apple HIG (Underline Tab Cấp 1 cao 46px viền đáy 3px Đồng Thau `#B45309`; Capsule Pills Cấp 2 cao 36px bo góc 18px; touch target >= 44x44pt; CTA cao 50-52pt).
- R3. Kiểm Duyệt Typography 7 Cấp & Tabular Nums (100% qua `<AppText>`, 7 cấp xxs -> display, de-bolding trần 600, tabularNums 100% số tiền/số lượng/mã đơn).
- R4. Cập Nhật & Vượt Qua Toàn Bộ Bộ Test (`tests/adversarial_theme_tokens.test.ts`, `tests/tier1_feature_coverage.test.ts`, `tests/adversarial_m2_stress.ts`), đảm bảo TypeScript check và test pass 100%.
