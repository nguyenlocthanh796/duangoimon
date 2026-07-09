# Execution Plan: Apple UI Optimization

## Objectives
Optimize and standardize the POS UI in `e:\posa\frontend` for iOS (iPhone/iPad) in **benchmark** integrity mode, covering:
1. **Font Integration**: Integrate `@expo-google-fonts/be-vietnam-pro` in `frontend/app/_layout.tsx` and sync it with `tailwind.config.js`.
2. **Responsive & Layout**: Ensure UI fits both iPhone and iPad screens elegantly.
3. **Design Aesthetics**: Use sharp/minimal corner radii (<= 4px / rounded-sm / rounded-md) and remove rounded-2xl/rounded-3xl.
4. **Touch Targets**: Standardize all touch targets to be at least 44x44 pt.
5. **Quality/Verification**: Ensure no compilation errors, run builds and tests, and verify via a Forensic Auditor.

## Decomposed Steps

### Phase 1: Exploration and Analysis
- Target: Inspect current files (`package.json`, `app/_layout.tsx`, `tailwind.config.js`, major screens).
- Subagent: `teamwork_preview_explorer` (Explorer) to perform read-only exploration and propose exact edits.

### Phase 2: Implementation
- Target: Install font package, edit layout file, config file, and main screens under `app/ban-hang/`, `app/login.tsx`, `app/ke-toan/`, and `app/quan-ly/`.
- Subagent: `teamwork_preview_worker` (Worker) to perform edits and run initial builds.

### Phase 3: Review and Quality Gates
- Target: Code review for Apple HIG, tailwind structure, and Touch Targets.
- Subagent: `teamwork_preview_reviewer` (Reviewer) to verify layout preservation, styling changes, and HIG touch target compliance.

### Phase 4: Adversarial and Forensic Audit
- Target: Run Challenger and Forensic Auditor to ensure no cheating, mock implementations, or integrity violations.
- Subagent: `teamwork_preview_challenger` (Challenger) to check compilation and test suite run.
- Subagent: `teamwork_preview_auditor` (Auditor) to perform forensic checks.
