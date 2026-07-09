## 2026-07-09T03:30:34Z
<USER_REQUEST>
You are a codebase implementer. Your working directory is `e:\posa\.agents\teamwork_preview_worker_m2_typography`.
Your task is to modify `lib/theme/typography.ts` in `e:\posa\frontend` to:
1. Reduce excessive bolding as requested:
   - Use 600/500 weights instead of 800/900/Bold for headers, bodies, prices, labels, buttons, tabs.
   - Define a missing `h4` token in `font` that other files reference (e.g., statValue / KPI value). Set it to:
     `h4: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: scale(15), fontWeight: '600' as const, lineHeight: getLineHeight(scale(15)) }`
   - Map `h1` to `BeVietnamPro_700Bold`, `h2` to `BeVietnamPro_700Bold`, `h3` to `BeVietnamPro_600SemiBold`, `bodyBold` to `BeVietnamPro_600SemiBold`.
   - Map `price` to `BeVietnamPro_600SemiBold`, `priceLarge` to `BeVietnamPro_700Bold`.
   - Map `button` and `buttonSmall` to `BeVietnamPro_600SemiBold`.
   - Map `label` to `BeVietnamPro_500Medium`.
   - Map `tab` to `BeVietnamPro_600SemiBold`.
   - Map `badge` to `BeVietnamPro_500Medium`.
2. Increase the typography scale factor slightly for better readability on iOS devices:
   - Change `scaleFactor` to `isIPad ? 1.45 : 1.12;` (was `isIPad ? 1.35 : 1.08`).
3. Ensure the code compiles cleanly and there are no TypeScript syntax errors.
4. Run standard syntax or compilation tests after modifying to make sure it doesn't break importing files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

</USER_REQUEST>
