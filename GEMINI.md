# 👑 QUY TẮC TOÀN DỰ ÁN ONGCHU LEAN POS (GEMINI.md)
> **Tài Liệu Hướng Dẫn & Trí Nhớ Vận Hành Dự Án POS F&B — Cái Tâm Vị Chủ Quán**

*(Chi tiết quy chuẩn kỹ thuật toàn diện xem tại [AGENTS.md](file:///d:/duanpos-ongchu/AGENTS.md))*

## 🎯 TRỌNG TÂM HIỆN TẠI (CURRENT FOCUS)
- **100% UI/UX Frontend First**: Hoàn thiện 10 màn hình (POS `/`, Thanh toán `/thanh-toan`, KDS `/kds`, Sổ đơn `/hoa-don`, Thực đơn `/thuc-don`, Cài đặt `/cai-dat`, Sổ quỹ `/so-quy`, Giao ca `/giao-ca`, Báo cáo `/bao-cao-loi-nhuan`, CFD `/cfd`) trên nền tảng **Expo SDK 57 (React 19, RN 0.86)**.
- **Layout**: Mobile (BottomNavBar 5-tab + Floating Drawer), Tablet/Web (AppRailNav 68px), CFD (Standalone).
- **Header & Navigation**: 100% dùng `<AppHeader>`, 2 dãy tabs (Tier 1 Underline 46px + Tier 2 Capsule 36px), Contextual Header Actions (`rightCustom`).
- **Typography Backbone**: Ưu tiên `<AppText variant="md">` (18px) làm chuẩn thông dụng 85-90% POS; tiêu đề/nhãn in đậm `weight="bold"`. Duy nhất `<AppHeader>` dùng `lg` (22px). TabularNums 100% cho số liệu, TextInput `fontSize >= 16px`.
- **System Theme & Orange Action**: Dual-theme Indochine (Light `#F9F6F0` / Dark `#14110E`), Nút thanh toán luồng Cam Apple `#B45309` chữ trắng xuyên suốt.
- **Component Invariants**: Zero-Modal Detail (Inline Sub-Screen phân nhánh unmount nền độc lập `itemFormVisible ? FORM : selectedItemDetail ? DETAIL : MAIN_LIST`), Phẳng hóa Mobile De-boxing tràn viền, Bottom Dock `48px` `md` bold (`paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4`), Touch target min 44x44pt.
- **CẤM DEPLOY DATABASE LÊN VPS**: CSDL trên VPS là dữ liệu thật (stateful). CẤM upload/ghi đè file `.db`, `.sqlite`, `data/` từ local lên VPS. Chỉ deploy Go binary và static frontend dist. Schema chỉ migrate qua GORM AutoMigrate.
- **🐎 Ponytail Mode Active**: Full (Default). Lazy Senior Dev, YAGNI, stdlib/native/existing dep, shortest diff, root-cause fix.

## 📌 SKILLS TÍCH HỢP
- [AGENTS.md](file:///d:/duanpos-ongchu/AGENTS.md) | [ongchu-lean-pos](file:///d:/duanpos-ongchu/.agents/skills/ongchu-lean-pos/SKILL.md) | [ongchu-frontend-expo](file:///d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md)
- [ongchu-backend-engine](file:///d:/duanpos-ongchu/.agents/skills/ongchu-backend-engine/SKILL.md) | [ongchu-hardware-devices](file:///d:/duanpos-ongchu/.agents/skills/ongchu-hardware-devices/SKILL.md) | [ongchu-security-hardening](file:///d:/duanpos-ongchu/.agents/skills/ongchu-security-hardening/SKILL.md) | [ponytail](file:///d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md)
