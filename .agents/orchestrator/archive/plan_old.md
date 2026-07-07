# Project Plan: POS App React Native / Expo

## Overview
We will build a professional React Native / Expo POS app with 3 modules: Bán hàng (Sales & POS), Quản lý (Management), and Kế toán (Accounting).
To avoid race conditions, we will split the development into sequential milestones or tracks, utilizing subagents for exploration, worker tasks, and reviews.

## Architecture & Code Layout
- Frontend: Expo SDK 57, Expo Router v4, TypeScript.
- Entry screen: `app/login.tsx`
- Sales module: `app/ban-hang/index.tsx`, `pos.tsx`, `payment.tsx`, `kitchen.tsx`
- Management module: `app/quan-ly/index.tsx`, `menu.tsx`, `tables.tsx`, `users.tsx`, `reports.tsx`
- Accounting module: `app/ke-toan/index.tsx`, `invoices.tsx`
- Global design: Drawer sidebar with role-based visibility (`lib/components/Sidebar.tsx`) and design tokens (`lib/theme.ts`).

## Milestones & Work Breakdown
We decompose the project into the following milestones:

### Milestone 1: Global Navigation & Auth Integration (R4 & R5)
- Enhance Login validation (username, password required check).
- Implement a global, role-based Drawer Sidebar (`lib/components/Sidebar.tsx`) that dynamically renders modules depending on the user's role (cashier, accountant, admin/manager) decoded from the JWT token or mapped from the login session.
- Ensure all screens have proper Safe Area routing and navigation controls to open the sidebar.

### Milestone 2: Redesign Sales & POS Module (R1 & R5)
- Redesign Table Selection (`app/ban-hang/index.tsx`) with status color codes (empty=green, occupied=orange, reserved=gray).
- Redesign POS/Ordering Screen (`app/ban-hang/pos.tsx`) with iPad split-pane / Phone tabs, category filters, and bottom-sheet modifiers.
- Redesign Payment Screen (`app/ban-hang/payment.tsx`) with cash numpad, auto change calculator, and API connection.
- Redesign Kitchen Display Screen (`app/ban-hang/kitchen.tsx`) with Kanban columns and real-time updates.

### Milestone 3: Redesign Management Module (R2 & R5)
- Redesign Dashboard (`app/quan-ly/index.tsx`) with 3+ live API stat cards.
- Redesign Menu Management (`app/quan-ly/menu.tsx`) with searchable product list and add/edit forms.
- Redesign Table Management (`app/quan-ly/tables.tsx`) with CRUD inline edits.
- Redesign User Management (`app/quan-ly/users.tsx`) with CRUD user-role selector.
- Redesign Reports (`app/quan-ly/reports.tsx`) with custom view-based charts (bar chart + daily sales).

### Milestone 4: Redesign Accounting Module (R3 & R5)
- Redesign Transactions Screen (`app/ke-toan/index.tsx`) with filter tabs (All / Thu / Chi) and transaction form.
- Redesign Invoices Screen (`app/ke-toan/invoices.tsx`) with status badges and create invoice form.

### Milestone 5: Verification & Hardening (R4 & R5)
- Complete E2E verification of all flows using dummy/actual backend calls.
- Polish UX/UI across all screens (safe area views, loading skeletons, error alerts).

## Execution Strategy
- For each milestone, we will spawn:
  1. An Explorer agent to analyze current screen logic, details of API calls, and propose a clean UI layout conforming to the design tokens and layout requirements.
  2. A Coder/Worker agent to implement the UI layout and hook up endpoints.
  3. A Reviewer agent to verify correctness, linting, and design alignment.
