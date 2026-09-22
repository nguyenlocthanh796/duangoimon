@echo off
chcp 65001 >nul
title KET NOI ONGCHU POS VAO TABLET (0ms SOCKET)
color 0a

echo =======================================================================
echo     👑 ONGCHU LEAN POS — KẾT NỐI VÀO MÁY ẢO TABLET (PORT 8085)
echo =======================================================================
echo.

set "ADB_BIN=D:\tools\platform-tools\adb.exe"
if not exist "%ADB_BIN%" set "ADB_BIN=D:\AndroidSDK\platform-tools\adb.exe"

echo [*] Dang tim thiet bi may ao Android...
set "TARGET_DEV="
for /f "tokens=1,2" %%A in ('"%ADB_BIN%" devices') do (
    if "%%B"=="device" (
        echo %%A | findstr "emulator" >nul 2>&1
        if not errorlevel 1 set "TARGET_DEV=%%A"
    )
)

if not defined TARGET_DEV (
    echo [!] Chua tim thay may ao! Vui long chay file "KhoiChay_MayAo_Tablet.bat" truoc.
    pause
    exit /b 1
)

echo [✓] Da phat hien may ao: %TARGET_DEV%
echo.

echo [*] Dang khoa cong dao nguoc sieu toc (8085, 8080)...
"%ADB_BIN%" -s %TARGET_DEV% reverse tcp:8085 tcp:8085 >nul 2>&1
"%ADB_BIN%" -s %TARGET_DEV% reverse tcp:8080 tcp:8080 >nul 2>&1
echo [✓] Da thiet lap 0ms Direct Socket!
echo.

echo [*] Dang kiem tra may chu POS Metro (Port 8085)...
netstat -ano | findstr ":8085" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Dang khoi dong may chu POS...
    start "OngChu POS Expo Server" cmd /k "cd /d D:\duanpos-ongchu\frontend && npm run dev"
    ping 127.0.0.1 -n 5 >nul
) else (
    echo [✓] May chu POS dang hoat dong tai port 8085.
)
echo.

echo [*] Dang nap App vao Expo Go tren Tablet...
"%ADB_BIN%" -s %TARGET_DEV% shell input keyevent 224 >nul 2>&1
"%ADB_BIN%" -s %TARGET_DEV% shell input keyevent 82 >nul 2>&1
"%ADB_BIN%" -s %TARGET_DEV% shell am start -a android.intent.action.VIEW -d "exp://localhost:8085" host.exp.exponent >nul 2>&1

echo.
echo =======================================================================
echo    🚀 HOAN TAT! APP DA DUOC NAP LEN MAN HINH TABLET.
echo =======================================================================
echo.
timeout /t 3 >nul
exit