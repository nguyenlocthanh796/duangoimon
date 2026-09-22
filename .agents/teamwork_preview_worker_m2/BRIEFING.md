# BRIEFING — 2026-09-17T09:17:00Z

## Mission
Execute Milestone 2: Upgrade 74 TextInput instances with fontSize < 16px and 5 missing fontSize instances to fontSize: 16 (Apple HIG compliant), and align Modal Headers in kho-hang and ProductFormModal.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: d:/duanpos-ongchu/.agents/teamwork_preview_worker_m2
- Original parent: af22ed07-f96a-48a4-b9d1-f8b47b7c0b54
- Milestone: Milestone 2 (TextInput 16px HIG compliance + Modal Header alignment)

## 🔒 Key Constraints
- Apple HIG: 100% TextInput must have fontSize >= 16px (no auto-zoom on iOS WebKit)
- Fix 5 missing fontSize positions
- Fix 74 fontSize < 16px positions
- Align Modal Headers in kho-hang and ProductFormModal to standard AppHeader title prop
- Run tsc --noEmit (0 errors)
- Do not hardcode or cheat; full forensic auditor verification expected

## Current Parent
- Conversation ID: af22ed07-f96a-48a4-b9d1-f8b47b7c0b54
- Updated: 2026-09-17T09:17:00Z

## Task Summary
- **What to build**: Fix 5 missing font sizes, upgrade 74 under-16px font sizes in TextInputs to 16, and align 2 modal headers.
- **Success criteria**: 100% TextInputs in frontend have fontSize >= 16; zero missing fontSize; modal headers aligned; tsc passes cleanly.
- **Interface contracts**: Apple HIG 16px rule for inputs; AppHeader title standard.
- **Code layout**: frontend/app and frontend/lib

## Change Tracker
- **Files modified**:
  - `frontend/app/cai-dat/_components/OwnerAccountTab.tsx`: Added fontSize: 16 to 3 inputs and s.inputBox
  - `frontend/app/giao-ca/index.tsx`: Added fontSize: 16 to modalInput
  - `frontend/lib/components/ui/AppOmniSearch.tsx`: Added fontSize: 16 to s.input
  - `frontend/app/kho-hang/index.tsx`: Standardized AppHeader (title/showBack), upgraded searchInput and input fontSize to 16
  - `frontend/app/thuc-don/_components/ProductFormModal.tsx`: Standardized AppHeader (title/showBack), upgraded customUnitInput fontSize to 16
  - `frontend/app/cai-dat/_components/OperationsTab.tsx`: Upgraded backendUrl fontSize from 12 to 16
  - `frontend/app/login/index.tsx`: Upgraded masterKeyInput fontSize from 13 to 16
  - `frontend/app/login/_components/SaaSAccountForm.tsx`: Upgraded lookupPhone (14->16) and masterKey (13->16)
  - `frontend/app/login/_components/StaffPinPad.tsx`: Upgraded masterKeyInput fontSize from 14 to 16
  - `frontend/app/bao-cao-loi-nhuan/_components/ReportCustomDateModal.tsx`: Upgraded dateInput fontSize from 14 to 16
  - `frontend/app/bao-cao-loi-nhuan/_components/ReportInvoicesTab.tsx`: Upgraded searchInput fontSize from 14 to 16
  - `frontend/app/hoa-don/index.tsx`: Upgraded searchInput fontSize from 14 to 16
  - `frontend/app/huong-dan/index.tsx`: Upgraded searchInput fontSize from 14 to 16
  - `frontend/app/khach-hang/components/CustomerFormModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/app/khach-hang/components/CustomerListView.tsx`: Upgraded searchInput fontSize from 14 to 16
  - `frontend/app/khach-hang/components/SettleDebtModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/app/thuc-don/_components/CategoryManagementTab.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/app/thuc-don/_components/ToppingManagementTab.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/app/thanh-toan/_components/EInvoiceModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/app/quan-ly-ban/index.tsx`: Upgraded searchInput and input fontSize from 14 to 16
  - `frontend/lib/components/pos/DiscountModal.tsx`: Upgraded seamlessVoucherInput fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/StaffFormModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/StaffListTab.tsx`: Upgraded searchInput fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/QuickShiftLogModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/ClockInOutModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/BonusDeductionModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/SalaryAdvanceModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/PaySalaryModal.tsx`: Upgraded input fontSize from 14 to 16
  - `frontend/lib/components/nhan-su/PayrollHistoryModal.tsx`: Upgraded searchInput fontSize from 14 to 16
  - `frontend/app/saas-admin/index.tsx`: Upgraded redeemKeyInput (13->16), editPrice (15->16), editMaxBranches (14->16), editMaxDevices (14->16), genNote (13->16), searchInput (14->16), formInput (14->16)
- **Build status**: PASS (cd frontend && npx tsc --noEmit exited with code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 0 TypeScript errors. All 143 JSX TextInputs have fontSize >= 16 (0 under 16, 0 missing).
- **Lint status**: Clean
- **Tests added/modified**: Verified via scan_inputs.py and filter_real_jsx_inputs.py

## Loaded Skills
- **Source**: d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md
  - **Local copy**: d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md
  - **Core methodology**: Frontend Universal Expo SDK 52, Design system dual-theme, Apple HIG 16px input, ergonomics.
- **Source**: d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md
  - **Local copy**: d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md
  - **Core methodology**: Lazy Senior Dev, minimal changes, YAGNI, simplest working solution, root-cause fixes in shared StyleSheet classes.

## Key Decisions Made
- Reused shared StyleSheet classes (`s.input`, `s.formInput`, `s.searchInput`) to upgrade multiple TextInputs at root-cause with minimal diff.
- Standardized modal headers in `kho-hang` and `ProductFormModal` with standard `title` and `showBack` props on `<AppHeader>`, eliminating custom `leftCustom` with `md` text and enabling full `variant="lg"` 22px bold title display.

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Situational awareness
- progress.md — Liveness & heartbeat
- scan_inputs.py — Verification script scanning all JSX <TextInput>
- handoff.md — Final completion report
