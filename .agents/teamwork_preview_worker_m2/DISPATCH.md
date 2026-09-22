## 2026-09-17T09:03:27Z

You are teamwork_preview_worker_m2.
Your working directory is: d:/duanpos-ongchu/.agents/teamwork_preview_worker_m2

You MUST read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (specifically section ## 2026-09-17T08:44:44Z) and d:/duanpos-ongchu/PROJECT.md before doing anything else.
Also read the survey report at:
d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_1/handoff.md (specifically Section 1.2 and the table of 74 positions + 5 missing positions).

Consult skills:
- d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md
- d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Scope (Milestone 2):
1. Fix 5 Missing `fontSize` on `<TextInput>`:
   - `frontend/app/cai-dat/_components/OwnerAccountTab.tsx`:
     - Lines ~590, 706, 729: Add `fontSize: 16` to the input style or inline style.
   - `frontend/app/giao-ca/index.tsx`:
     - Line 1591 in `modalInput`: Add `fontSize: 16`.
   - `frontend/lib/components/ui/AppOmniSearch.tsx`:
     - Line 421 in `s.input`: Add `fontSize: 16`.

2. Upgrade all 74 `TextInput` instances with `fontSize < 16px` to `fontSize: 16` (to strictly follow Apple HIG and eliminate iOS WebKit auto-zoom):
   - `app/cai-dat/_components/OperationsTab.tsx`: line ~656 (change 12 to 16)
   - `app/saas-admin/index.tsx`: lines ~1160, 3887 (13 to 16), 3394 (15 to 16), lines ~1543, 1563, 1584, 1605, 2858, 3082, 3094, 3107, 3120, 3457, 3502 (14 to 16)
   - `app/login/_components/SaaSAccountForm.tsx`: line ~614 (13 to 16), line ~443 (14 to 16)
   - `app/login/index.tsx`: line ~594 (13 to 16)
   - `app/kho-hang/index.tsx`: lines ~406, 1107, 1124, 1285, 1467, 1480, 1537, 1549, 1563, 1580 (14 to 16)
   - `app/thuc-don/_components/CategoryManagementTab.tsx`: line ~310 (14 to 16)
   - `app/thuc-don/_components/ProductFormModal.tsx`: line ~1127 (14 to 16)
   - `app/thuc-don/_components/ToppingManagementTab.tsx`: lines ~293, 313 (14 to 16)
   - `app/thanh-toan/_components/EInvoiceModal.tsx`: lines ~169, 196, 217, 238 (14 to 16)
   - `app/quan-ly-ban/index.tsx`: lines ~949, 1446, 1608 (14 to 16)
   - `app/khach-hang/components/CustomerFormModal.tsx`: lines ~72, 83, 95, 107 (14 to 16)
   - `app/khach-hang/components/CustomerListView.tsx`: line ~248 (14 to 16)
   - `app/khach-hang/components/SettleDebtModal.tsx`: lines ~147, 158 (14 to 16)
   - `app/bao-cao-loi-nhuan/_components/ReportCustomDateModal.tsx`: lines ~142, 162 (14 to 16)
   - `app/bao-cao-loi-nhuan/_components/ReportInvoicesTab.tsx`: line ~51 (14 to 16)
   - `app/hoa-don/index.tsx`: line ~899 (14 to 16)
   - `app/huong-dan/index.tsx`: line ~986 (14 to 16)
   - `app/login/_components/StaffPinPad.tsx`: line ~473 (14 to 16)
   - `lib/components/pos/DiscountModal.tsx`: line ~523 (14 to 16)
   - `lib/components/nhan-su/StaffFormModal.tsx`: lines ~156, 170, 199, 301, 316, 331 (14 to 16)
   - `lib/components/nhan-su/StaffListTab.tsx`: line ~79 (14 to 16)
   - `lib/components/nhan-su/QuickShiftLogModal.tsx`: lines ~201, 215, 231, 245 (14 to 16)
   - `lib/components/nhan-su/ClockInOutModal.tsx`: lines ~170, 202, 216 (14 to 16)
   - `lib/components/nhan-su/BonusDeductionModal.tsx`: lines ~100, 118, 133 (14 to 16)
   - `lib/components/nhan-su/SalaryAdvanceModal.tsx`: lines ~130, 191 (14 to 16)
   - `lib/components/nhan-su/PaySalaryModal.tsx`: line ~228 (14 to 16)
   - `lib/components/nhan-su/PayrollHistoryModal.tsx`: line ~81 (14 to 16)

3. Modal Header Alignment:
   - `frontend/app/kho-hang/index.tsx`: line ~1346: Use standard prop `title={editingItem ? 'Sửa Mặt Hàng Kho' : 'Thêm Hàng Hóa Mới'}` on `<AppHeader>` instead of leftCustom with md text.
   - `frontend/app/thuc-don/_components/ProductFormModal.tsx`: line ~319: Use standard prop `title={itemToEdit ? 'Chỉnh Sửa Món' : 'Thêm Món Mới'}` on `<AppHeader>`.

Verification Requirements:
- Run `cd frontend && npx tsc --noEmit` and confirm 0 errors (Exit code 0).
- Run a scan on JSX <TextInput> to verify that 100% of TextInput elements now have `fontSize >= 16px` and zero missing fontSize.
- Write a detailed completion report to:
  d:/duanpos-ongchu/.agents/teamwork_preview_worker_m2/handoff.md
- Use send_message to report completion when done.
