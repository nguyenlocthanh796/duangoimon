# POS Design Reference

Reference HTML/CSS/JS UI for POS BanHang module.
Source: Sample HTML from user (2026-07-02)
Use as design spec for Expo React Native build.

## Key Screens
1. **Sơ đồ bàn** (Table selection) — grid 3-4 col, occupied/empty state
2. **Menu món** (Product menu) — grid with category filter, card overlay
3. **Giỏ hàng** (Cart) — item list with qty control, thumbnails
4. **Modifier Modal** — size, topping, qty, note
5. **Thanh toán** (Payment) — numpad, change calc, method selector
6. **Màn hình Bếp** (Kitchen) — Kanban 2 columns: pending/completed

## Design Tokens
- Primary: #F97316 (orange)
- Success: #10B981
- Danger: #EF4444
- BG: #F8FAFC
- Cards: white with border/shadow
- Radius: 2xl (16px) standard
- Font: Inter

## Interaction
- active:scale-95 on touch
- Bottom sheet modifier modal
- Safe area aware
- Hide-scroll utility
