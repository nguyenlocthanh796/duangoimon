@echo off
chcp 65001 >nul
title ONGCHU LEAN POS - LAUNCHER PIXEL PHONE

echo ==============================================================================
echo    👑 ONGCHU LEAN POS — KHỞI CHẠY MÁY ẢO PIXEL PHONE (PIXEL 7 PRO)
echo ==============================================================================
echo.

REM 1. CAU HINH DUONG DAN
set "ADB_BIN=D:\tools\platform-tools\adb.exe"
if not exist "%ADB_BIN%" set "ADB_BIN=D:\AndroidSDK\platform-tools\adb.exe"
set "EMU_DIR=D:\AndroidSDK\emulator"

REM 2. KIEM TRA XEM MAY AO PIXEL PHONE DA CHAY CHUA
echo [*] Dang quet cac may ao Android...
set "TARGET_DEV="

for /f "tokens=1,2" %%A in ('"%ADB_BIN%" devices') do (
    if "%%B"=="device" (
        echo %%A | findstr "emulator" >nul 2>&1
        if not errorlevel 1 set "TARGET_DEV=%%A"
    )
)

if not defined TARGET_DEV (
    echo [*] May ao Pixel Phone chua mo.
    echo [*] Dang khoi dong cua so Pixel_7_Pro tren man hinh Desktop...
    pushd "%EMU_DIR%"
    start "" emulator.exe -avd Pixel_7_Pro
    popd
    
    echo [*] Dang doi cua so may ao Pixel Phone xuat hien va ket noi ADB...
    :WAIT_FOR_PHONE
    ping 127.0.0.1 -n 3 >nul
    for /f "tokens=1,2" %%A in ('"%ADB_BIN%" devices') do (
        if "%%B"=="device" (
            echo %%A | findstr "emulator" >nul 2>&1
            if not errorlevel 1 set "TARGET_DEV=%%A"
        )
    )
    if not defined TARGET_DEV (
        echo     ... dang cho may ao nap ...
        goto WAIT_FOR_PHONE
    )
)

echo [✓] Da ket noi dung may ao Phone: %TARGET_DEV%
echo.

REM 3. KHOA CONG DAO NGUOC SIEU TOC (0ms DIRECT SOCKET)
echo [*] Dang thiet lap Reverse Port Forwarding cho %TARGET_DEV%...
"%ADB_BIN%" -s %TARGET_DEV% reverse tcp:8085 tcp:8085 >nul 2>&1
"%ADB_BIN%" -s %TARGET_DEV% reverse tcp:8080 tcp:8080 >nul 2>&1
echo [✓] Da cau hinh cong dao nguoc 0ms:
echo     • Metro Bundler : tcp:8085 -^> tcp:8085
echo     • Backend Go API: tcp:8080 -^> tcp:8080
echo.

REM 4. BAT SANG VA MO KHOA MAN HINH
echo [*] Dang danh thuc va mo khoa man hinh...
"%ADB_BIN%" -s %TARGET_DEV% shell input keyevent 224 >nul 2>&1
"%ADB_BIN%" -s %TARGET_DEV% shell input keyevent 82 >nul 2>&1
echo [✓] Man hinh Phone da san sang.
echo.

REM 5. KIEM TRA MAY CHU METRO EXPO (PORT 8085)
echo [*] Dang kiem tra may chu Expo Metro (Port 8085)...
netstat -ano | findstr ":8085" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Cong 8085 chua mo. Dang tu dong khoi dong Expo Server...
    start "OngChu POS Expo Server" cmd /k "cd /d %~dp0frontend && npm run dev"
    echo [*] Dang doi Metro Bundler san sang...
    ping 127.0.0.1 -n 5 >nul
) else (
    echo [✓] May chu Expo Metro dang chay on dinh tai port 8085.
)
echo.

REM 6. BAN INTENT NAP APP TRUC TIEP VAO EXPO GO
echo [*] Dang nap OngChu POS vao Expo Go tren %TARGET_DEV%...
"%ADB_BIN%" -s %TARGET_DEV% shell am start -a android.intent.action.VIEW -d "exp://localhost:8085" host.exp.exponent >nul 2>&1

if %errorlevel% equ 0 (
    echo [✓] DA NAP THANH CONG VAO EXPO GO TREN PHONE!
) else (
    echo [!] Dang thu mo qua trinh duyet Chrome...
    "%ADB_BIN%" -s %TARGET_DEV% shell am start -a android.intent.action.VIEW -d "http://localhost:8085" com.android.chrome >nul 2>&1
)

echo.
echo ==============================================================================
echo    🚀 HOAN TAT! CUA SO PHONE DA HIEN THI TREN MAN HINH WINDOWS CUA BAN.
echo ==============================================================================
echo.
pause