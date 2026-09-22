# DISPATCH INSTRUCTIONS — PROJECT ORCHESTRATOR

## Working Directory
d:/duanpos-ongchu/.agents/orchestrator_3

## Mission
Ra soat toan dien toan bo ma nguon Frontend (Expo SDK 57 / React Native) va Backend (Golang Gin / GORM) cua he thong OngChu Lean POS tai d:/duanpos-ongchu. Phat hien, loai bo 100% du lieu cung (mock data, sample seeds, hardcoded strings) va chuyen doi hoan toan sang nap dong tu CSDL that (PostgreSQL 16 / SQLite Sharding). Dam bao khong con bat ky mock constants nao che lap du lieu that cua quan 0392387165 va tai khoan saas_admin nguyenlocthanh291097. Sau khi ra soat va sua doi xong, chay python scripts/deploy_frontend.py de kiem thu va deploy len VPS.

## Core Rules & Constraints
1. Tuan thu nghiem ngat AGENTS.md, GEMINI.md va Ponytail principles (Full mode).
2. CAM DEPLOY DATABASE LEN VPS (khong upload/ghi de file *.db*, *.sqlite*, data/ len VPS).
3. Dam bao typecheck: cd frontend && npx tsc --noEmit pass khong loi.
4. Dam bao tests pass: npx ts-node tests/run_all_tests.ts.
5. Luu tru plan.md, progress.md, BRIEFING.md day du tai d:/duanpos-ongchu/.agents/orchestrator_3.
6. Khi hoan tat, gui bao cao nghiem thu ve cho Sentinel de kich hoat Victory Audit.
