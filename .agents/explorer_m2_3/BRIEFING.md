# BRIEFING — 2026-07-04T11:00:00+07:00

## Mission
Analyze frontend files (AuthContext, Sidebar, tsconfig) to design critical fixes for Auth Guard, FOUC, JSON parsing, orientation, and tsconfig excludes.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigator, analyzer, synthesizer
- Working directory: e:\posa\.agents\explorer_m2_3
- Original parent: 37300bd8-cac2-4541-9bb9-adc34db321e7
- Milestone: Milestone 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CODE_ONLY network mode: no external web access

## Current Parent
- Conversation ID: 37300bd8-cac2-4541-9bb9-adc34db321e7
- Updated: 2026-07-04T11:00:00+07:00

## Investigation State
- **Explored paths**:
  - `lib/context/AuthContext.tsx` — Authentication provider, guard, local storage reading
  - `lib/components/Sidebar.tsx` — Layout, dimensions, role menus
  - `tsconfig.json` — Typescript config
  - `app/ban-hang/index.tsx` — Table screen dimensions
  - `app/ban-hang/pos.tsx` — POS screen dimensions
- **Key findings**:
  - AuthContext provider renders children immediately, causing FOUC.
  - No default-deny check exists for unrecognized roles.
  - JSON parse of corrupted `pos_user` can crash auth context initialization.
  - Screen dimensions are read statically instead of dynamically in Sidebar and POS screens.
  - Exclude list missing in `tsconfig.json` which includes dist files under compilation.
- **Unexplored areas**:
  - Backend integration details (not requested).

## Key Decisions Made
- Use `useWindowDimensions()` to achieve dynamic, responsive layout updates.
- Put a localized `try-catch` inside `initAuth` to handle corrupted user storage.
- Exclude `"dist"` in `tsconfig.json` root.

## Artifact Index
- e:\posa\.agents\explorer_m2_3\handoff.md — Final investigation report
