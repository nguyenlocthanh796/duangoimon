# Master Orchestration Plan: Frontend Indochine Heritage & Apple HIG Standardization

## Objective
Kiểm duyệt, rà soát và chuẩn hóa 100% các thành phần giao diện, màn hình và component trên frontend Expo SDK 52 của dự án `duanpos-ongchu`, xóa bỏ toàn bộ mã màu hardcode cũ (Slate, Jade, Orange), đồng bộ sang hệ thống token Indochine Heritage, tuân thủ nghiêm ngặt Apple HIG và Typography 7 cấp, đảm bảo test suite pass 100%.

## Strategy & Topology: Project Pattern
- **Top-level Orchestrator**: `orchestrator_1` (Dispatch-only, never touches code or runs commands directly).
- **Phase 0: Multi-Explorer Survey**:
  - Spawn 3 parallel Explorers:
    1. Explorer A (`survey_colors_tokens`): Map all color hardcoding, theme token mismatches in `app/` and `lib/components/`.
    2. Explorer B (`survey_navigation_hig`): Map navigation layers (Tabs Cấp 1, Chip Pills Cấp 2, Header right actions, touch targets 44pt, CTA 50-52pt).
    3. Explorer C (`survey_typography_tests`): Map typography 7 scales, tabularNums, and test suite failure points in `tests/adversarial_theme_tokens.test.ts`, `tests/tier1_feature_coverage.test.ts`, `tests/adversarial_m2_stress.ts`.
- **Phase 1: Merge & Milestone Architecture (`PROJECT.md`)**:
  - Consolidate findings into Feature Inventory and Milestones (e.g. M1: Theme & Colors, M2: Navigation & HIG, M3: Typography & Tests).
- **Phase 2: Execution Loops (Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate)**.
- **Phase 3: Final Verification & Test Hardening**.
