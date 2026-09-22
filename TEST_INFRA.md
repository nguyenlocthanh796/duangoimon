# E2E Test Infra: OngChu Lean POS

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Strict verification of 0 TypeScript errors (`npx tsc --noEmit`), 60 FPS UI ergonomics, ESC/POS byte integrity, and backend sub-millisecond efficiency.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Zustand Atomic Selectors | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | FlashList 60 FPS & CartItemRow Memo | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Core Algorithms (Search, Modifiers, Cash) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Typography 5 Tiers (<AppText>) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 5 | Tabular Nums on All Numerics | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 6 | Dual-Theme High-Contrast Tokens | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 7 | >20% Discount Anti-Fraud Guard | AGENTS.md §Pillar 6 | 5 | 5 | ✓ |
| 8 | Gin Handlers & DB Transactions | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 9 | WebSocket Hub Buffered Broadcast | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 10 | ESC/POS sync.Pool & Socket 9100 | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 11 | Backend Memory (<15MB) & Startup (<0.05s) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: Node.js / Jest / TS-Node test runner in `frontend/` and Go test suite in `backend/`.
- Type Checking: `npx tsc --noEmit` in `frontend/` (0 errors required).
- Verification Channels: Exit code, stdout output, JSON payload contracts, byte stream analysis.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Fast-Paced Lunch Rush POS Order | Search, FlashList, Modifiers, Cart, Discount Guard, Payment, Presets | High |
| 2 | Table Split, Transfer & Multi-Cart Sync | TableCard, Zustand Table Slices, WebSocket Hub, Broadcast | High |
| 3 | Cash Shift Open, Expenses & Close Count | CASH_DENOMINATIONS, So Quy, Shift Difference, Audit Log | High |
| 4 | Direct Thermal Print & Cash Drawer Kick | ESC/POS Builder, sync.Pool, Auto-cut, RJ11 Drawer Opcode | Medium |
| 5 | End-of-Day 3 Golden Numbers P&L Audit | Gin Query Merging, Cash Flow, VietQR Totals, Owner PnL | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature (≥55 test cases)
- Tier 2: ≥5 per feature (≥55 boundary test cases)
- Tier 3: Pairwise coverage of major feature interactions (≥15 test cases)
- Tier 4: ≥5 realistic application scenarios
- Total: ≥130 comprehensive test cases
