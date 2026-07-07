# BRIEFING — 2026-07-04T04:00:00Z

## Mission
Examine table map and POS screens in e:\posa\frontend, and propose a detailed implementation strategy for UI/UX improvements, modifiers, and cart updates.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only investigator, analyzer
- Working directory: e:\posa\.agents\explorer_m2_1
- Original parent: 37300bd8-cac2-4541-9bb9-adc34db321e7
- Milestone: M2 - Ban Hang POS redesign proposals

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Code-only network restrictions (no external web access, only local searching/viewing tools)

## Current Parent
- Conversation ID: 37300bd8-cac2-4541-9bb9-adc34db321e7
- Updated: 2026-07-04T04:00:00Z

## Investigation State
- **Explored paths**:
  - `e:\posa\frontend\app\ban-hang\index.tsx` (Table map layout and routing parameters)
  - `e:\posa\frontend\app\ban-hang\pos.tsx` (POS screen, iPad split view vs mobile tab views, modifier modal, and order creation API call)
  - `e:\posa\frontend\lib\theme.ts` (Centralized design tokens and formatter helper)
  - `e:\posa\backend\app\api\v1\ban_hang\orders.py` (FastAPI backend schemas and order database mapping)
  - `e:\posa\backend\app\models\ban_hang.py` (Database model for order item options)
- **Key findings**:
  - Modifier options (sizes, toppings) are collected in the modal state but completely stripped out when serializing the payload for the `createOrder` API call in the frontend. The backend already accepts options JSONB.
  - Adding items from the modifier modal bypasses merge checks, creating multiple rows for the same customized product.
  - Sizing delta prices are currently hardcoded, and theme colors from `lib/theme.ts` are bypass-implemented in favor of raw CSS hex codes.
  - Standard button/touch targets (like product add/remove, quantity steppers, and filters) range from 26px to 38px, violating the accessibility standard of 44px.
- **Unexplored areas**:
  - Active order loading and modification (requires backend PUT endpoint).

## Key Decisions Made
- Recommending a replacement of raw wrap layout inside ScrollView on index.tsx with dynamic key FlatList for orientation resilience.
- Recommending a clean merging logic during modal cart additions based on deep-equality of product ID, size, toppings, and notes.
- Outlining exact before/after diffs for option payload preservation on createOrder API call.
- Detailing styling adjustments (padding and sizes) to bring touch target dimensions to at least 44px.

## Artifact Index
- e:\posa\.agents\explorer_m2_1\handoff.md — Analysis and implementation strategy proposal report
