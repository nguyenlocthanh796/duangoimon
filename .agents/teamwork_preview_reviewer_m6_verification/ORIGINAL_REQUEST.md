## 2026-07-09T03:52:41Z
You are a review agent. Your working directory is `e:\posa\.agents\teamwork_preview_reviewer_m6_verification`.
Your task is to verify that all modifications across the target modules are correct, complete, and compile without errors:
1. Run `npx tsc --noEmit` inside `e:\posa\frontend` to confirm the entire project compiles successfully.
2. Verify that absolutely NO files under `app/ban-hang/*` or sales-related components have been modified (they must be completely untouched).
3. Inspect `lib/theme/typography.ts` to confirm that weights are reduced to 600/500 and that the iPad/iOS scale factors are adjusted.
4. Verify that touch targets across login, sidebar, accounting, and management screens are all >= 44x44 pt.
5. Verify that hover and touch pointer feedback is implemented on interactive elements.
6. Verify that border radiuses are set to 4px.
7. Write a detailed handoff report to `handoff.md` in your working directory and notify the parent.
