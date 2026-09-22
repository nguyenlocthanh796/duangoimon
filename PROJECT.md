# Project: OngChu Lean POS — Typography 7-Tier & Dual-Theme Anti-Glare Standardization (Apple HIG)

## Architecture
- **Framework**: Universal Expo SDK 52 (React Native 0.76.6) with Zustand Multi-Table Cart Engine + Shopify FlashList 60 FPS.
- **Theme Engine**: Dual-Theme Indochine Light (`#F9F6F0` Ngà Giấy Dó, `#1C1917` Mực Gỗ Mun, `#B45309` Vàng Đồng Thau Phin) & Anti-Glare Dark Mode (`#14110E` Nâu Than Cà Phê, `#1E1813` Gỗ Gụ Đen, `#F3EFEA` Trắng Ngà, `#B45309` Vàng Đồng Thau Phin) at `frontend/lib/theme/`.
- **Typography Standard**: `<AppText>` 7 standard tiers (`xxs`: 12/16px, `xs`: 14/20px, `sm`: 16/22px, `md`: 18/26px, `lg`: 22/30px, `xl`: 24/34px, `display`: 28/38px) with `md` (18px) serving as the 85–90% POS content backbone.
- **Apple HIG TextInput Invariant**: 100% `TextInput` components strictly enforce `fontSize >= 16px` (`sm` 16px, `md` 18px, or `hero` 22px) to eliminate iOS WebKit auto-zoom viewport distortion.
- **Apple Warm Orange Action Thread**: 100% checkout/settlement action buttons [Gọi Món -> Giỏ Hàng -> Nghiệp Vụ Bàn -> Xong & In Bill] use `#B45309` (`theme.brand.accent`) with white text (`theme.text.onBrand`).
- **Zero Arbitrary Hex Rule**: 100% semantic color tokens via `useTheme()` across all 10 screens and components.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Theme Tokens & Colors Standardization | Update `colors.ts` with Anti-Glare `darkTheme.brand.accent = '#B45309'`, `surface.header = '#17120E'`, update comments | M1 | Survey 2, 3 |
| 2 | Typography 7-Tier Default & Token Sync | Update `tokens.ts` (add `xxs`, `xl`, `display`), set default fallback in `AppText.tsx` to `variant="md"`, fix `typography.ts` `xxs` line-height | M1 | Survey 1, 3 |
| 3 | M3 Remnants Cleanup | Fix `AppHeader.tsx:248` (`labelLarge`), `BottomNavBar.tsx:228` (`labelSmall`), `Card.tsx:67` (`titleMedium`) | M1 | Survey 1 |
| 4 | Apple Warm Orange Action Thread Fixes | Fix `MobileCartBar.tsx:132` (`theme.brand.accent`), `TabletCartPane.tsx:392` (`variant="accent"`), `BottomNavBar.tsx:293` (Indochine active tab) | M1 | Survey 2, 3 |
| 5 | Hardcoded Hex Elimination (12 spots) | Replace 12 hardcoded hex instances in `bao-cao-loi-nhuan`, `login`, `VietQRPaymentPane`, `TablePickerModal` with semantic tokens | M1 | Survey 2 |
| 6 | Missing TextInput fontSize Fixes (5 spots) | Add `fontSize: 16` to `OwnerAccountTab.tsx` (3 inputs), `giao-ca/index.tsx` (modalInput), `AppOmniSearch.tsx` | M2 | Survey 1 |
| 7 | TextInput < 16px Normalization (74 spots) | Upgrade all 74 `TextInput` instances with `fontSize < 16px` to `fontSize: 16` across `saas-admin`, `kho-hang`, `thuc-don`, `thanh-toan`, `quan-ly-ban`, `khach-hang`, `nhan-su`, etc. | M2 | Survey 1 |
| 8 | Modal Header Variant Alignment | Fix `kho-hang/index.tsx:1346` and `ProductFormModal.tsx:319` to use standard `<AppHeader title="...">` (`lg` 22px bold) | M2 | Survey 1 |
| 9 | Documentation Sync (AGENTS.md & GEMINI.md) | Sync 7 typography tiers, `#14110E` Dark Mode, `#B45309` Warm Orange Thread, `TextInput >= 16px` in docs | M3 | Survey 3 |
| 10 | Test Suite Assertions Synchronization | Update `tier1_feature_coverage.test.ts` and `adversarial_theme_tokens.test.ts` to assert Anti-Glare Indochine tokens | M3 | Survey 2, 3 |
| 11 | Static Audits & Type Check | `npx tsc --noEmit` (0 errors), zero arbitrary hex, zero raw `<Text>`, zero `TextInput < 16px` | M4 | Survey 1, 2, 3 |
| 12 | Master Test Suite Execution | Run `npx ts-node tests/run_all_tests.ts` ensuring 100% pass | M4 | Survey 3 |
| 13 | Real Android Device Testing (ADB MCP) | Verify rendering and contrast on Sony Xperia 901SO via ADB MCP Server | M4 | R4 & Acceptance Criteria |
| 14 | Quality Gate & Multi-Agent Audits | 2 Reviewers APPROVE, 2 Challengers PASS, 1 Forensic Auditor CLEAN | M4 | Project Pattern Protocol |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Theme Engine, Typography 7-Tier Defaults, Warm Orange Thread & Hex Elimination | `frontend/lib/theme/` (`colors.ts`, `tokens.ts`, `typography.ts`), `frontend/lib/components/ui/` (`AppText.tsx`, `AppHeader.tsx`, `BottomNavBar.tsx`, `Card.tsx`), `MobileCartBar.tsx`, `TabletCartPane.tsx`, 12 hardcoded hex spots in `app/` and `lib/` | none | DONE |
| M2 | TextInput Apple HIG 16px Normalization & Modal Headers | 79 `TextInput` components across `app/` and `lib/components/` (5 missing + 74 `< 16px`), modal headers in `kho-hang` and `ProductFormModal` | M1 | DONE |
| M3 | Documentation Sync & Test Suite Alignment | `AGENTS.md`, `GEMINI.md`, `frontend/tests/tier1_feature_coverage.test.ts`, `frontend/tests/adversarial_theme_tokens.test.ts` | M1, M2 | DONE |
| M4 | Comprehensive Verification, Quality Gate & Real Device ADB Testing | Full test suite execution, static scans, ADB MCP Android device testing, Reviewers (2), Challengers (2), Forensic Auditor (1) | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts
### Theme Tokens Contract (`frontend/lib/theme/colors.ts` & `tokens.ts`)
- `lightTheme`:
  - `surface.app`: `#F9F6F0` (Ngà Giấy Dó)
  - `surface.card`: `#FFFFFF` (Trắng Men Gốm)
  - `text.primary`: `#1C1917` (Mực Gỗ Mun)
  - `text.onBrand`: `#FFFFFF` (Chữ trắng trên nút Đen Gỗ Mun hoặc Cam Đồng Thau)
  - `brand.primary`: `#1C1917` (Đen Gỗ Mun)
  - `brand.accent`: `#B45309` (Vàng Đồng Thau Phin)
- `darkTheme` (Anti-Glare):
  - `surface.app`: `#14110E` (Nâu Than Cà Phê Trầm)
  - `surface.card`: `#1E1813` (Gỗ Gụ Đen Nâu Trầm)
  - `surface.header`: `#17120E`
  - `text.primary`: `#F3EFEA` (Trắng Ngà Gốm Sứ)
  - `text.onBrand`: `#FFFFFF`
  - `brand.primary`: `#B45309` (Vàng Đồng Thau Phin)
  - `brand.accent`: `#B45309` (Vàng Đồng Thau Phin)
  - `border.default`: `#382E25`
  - `border.subtle`: `rgba(243, 239, 234, 0.12)`
- Status tokens:
  - `readyBg`: `theme.status.readyBg`
  - `dangerBg`: `theme.status.dangerBg`
  - `warningBg`: `theme.status.warningBg`
  - `qrCanvas`: `theme.surface.qrCanvas` (`#FFFFFF`)

### Typography Contract
- 7 Tiers: `xxs` (12px), `xs` (14px), `sm` (16px), `md` (18px), `lg` (22px), `xl` (24px), `display` (28px).
- Default fallback in `<AppText>`: `variant = 'md'`.
- All `TextInput`: `fontSize >= 16` (`[16, 18, 22]`).

### Action Thread Contract
- 100% checkout action buttons use `backgroundColor: theme.brand.accent` (`#B45309`) with text `theme.text.onBrand` (`#FFFFFF`).

## Code Layout
- `frontend/lib/theme/`: Theme tokens, colors, hook definitions (`colors.ts`, `tokens.ts`, `typography.ts`).
- `frontend/lib/components/ui/`: Core UI components (`AppText.tsx`, `AppHeader.tsx`, `BottomNavBar.tsx`, `Button.tsx`).
- `frontend/lib/components/pos/`: POS components (`MobileCartBar.tsx`, `FullScreenCartModal.tsx`, `TableOpsHubView.tsx`, etc.).
- `frontend/app/`: Application screens (`thanh-toan/`, `so-quy/`, `giao-ca/`, `bao-cao-loi-nhuan/`, etc.).
- `frontend/tests/`: Automated test suites (`run_all_tests.ts`, `tier1_feature_coverage.test.ts`, etc.).
