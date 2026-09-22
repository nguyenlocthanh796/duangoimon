@echo off
setlocal EnableDelayedExpansion
title ONGCHU LEAN POS - DIEU PHOI 5 MAN HINH AO

cd /d "D:\duanpos-ongchu"
if not exist "scripts\start_terminals.ps1" (
    echo [LOI] Khong tim thay scripts\start_terminals.ps1 tai D:\duanpos-ongchu
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\duanpos-ongchu\scripts\start_terminals.ps1" -Action "%~1"
if %errorlevel% neq 0 (
    echo.
    echo [THONG BAO] Tien trinh da ket thuc voi ma loi %errorlevel%.
    pause
)