## 🐎 Ponytail Checklist (Lazy Senior Dev)

- [ ] **YAGNI**: Does this code strictly need to exist? (No speculative features or dead code)
- [ ] **Reuse Existing**: Reused helpers, components (`AppText`, `AppHeader`, `useTheme`), and patterns already in the codebase?
- [ ] **No Unnecessary Packages**: No new npm or Go dependencies added if stdlib/native/existing code can do it?
- [ ] **Root-Cause Fix**: If fixing a bug, fixed at the shared root cause rather than patching just the caller symptom?
- [ ] **Minimal Working Diff**: Shortest working diff? Deletion over addition? Boring over clever?
- [ ] **OngChu Invariants Preserved**:
  - [ ] 4 typography sizes (`xs`, `sm`, `md`, `lg`) & max font weight 600
  - [ ] `tabularNums` on all money, numbers, and quantities
  - [ ] Dual-Theme tokens (`useTheme()`)
  - [ ] Safety, cash flow, and audit trail intact

### Summary of Change (<= 3 lines)
* **What was built**: 
* **What was skipped/simplified (YAGNI)**: 
* **When to upgrade (if marked with `ponytail:`)**: 
