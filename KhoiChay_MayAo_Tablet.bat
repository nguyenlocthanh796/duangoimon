@echo off
title KHOI CHAY MAY AO TABLET POS - TU DONG VAO DU AN
color 0a

echo =======================================================================
echo     KHOI CHAY MAY AO TABLET - TU DONG VAO EXPO GO VA DU AN POS
echo =======================================================================
echo.
echo [*] GPU: NVIDIA GeForce GTX 1070 Ti (Vulkan 60FPS)
echo [*] Man hinh: Google Pixel Tablet (2560x1600 Landscape)
echo.

set "ANDROID_HOME=D:\AndroidSDK"
set "JAVA_HOME=D:\AndroidSDK\jdk-17"
set "PATH=D:\AndroidSDK\jdk-17\bin;D:\AndroidSDK\emulator;D:\AndroidSDK\platform-tools;%PATH%"

REM 1. DANG TIM MAY AO TABLET
echo [*] Dang kiem tra may ao Tablet...
set "TARGET_DEV="

for /f "tokens=1,2" %%A in ('adb devices') do (
    if "%%B"=="device" (
        adb -s %%A shell wm size 2>nul | findstr "2560x1600" >nul 2>&1
        if not errorlevel 1 set "TARGET_DEV=%%A"
    )
)

if not defined TARGET_DEV (
    echo [*] Dang mo cua so May ao Tablet tren Desktop...
    start "" "D:\AndroidSDK\emulator\emulator.exe" -avd Pixel_Tablet_POS -gpu host -no-metrics
    echo [*] Dang cho may ao khoi dong xong...
    :WAIT_BOOT
    ping 127.0.0.1 -n 3 >nul
    for /f "tokens=1,2" %%A in ('adb devices') do (
        if "%%B"=="device" (
            adb -s %%A shell wm size 2>nul | findstr "2560x1600" >nul 2>&1
            if not errorlevel 1 set "TARGET_DEV=%%A"
        )
    )
    if not defined TARGET_DEV goto WAIT_BOOT
    
    echo [*] Cho he dieu hanh Android Tablet nap on dinh...
    ping 127.0.0.1 -n 8 >nul
)

echo [OK] Da ket noi dung may ao Tablet: %TARGET_DEV%
echo.

REM 2. KHOA CONG DAO NGUOC 0ms DIRECT SOCKET
echo [*] Dang thiet lap Reverse Port Forwarding (8085, 8080)...
adb -s %TARGET_DEV% reverse tcp:8085 tcp:8085 >nul 2>&1
adb -s %TARGET_DEV% reverse tcp:8080 tcp:8080 >nul 2>&1
echo [OK] Da khoa cong 0ms Direct Socket:
echo      - Metro Bundler : tcp:8085 -^> tcp:8085
echo      - Backend Go API: tcp:8080 -^> tcp:8080
echo.

REM 3. BAT SANG VA MO KHOA MAN HINH TABLET
adb -s %TARGET_DEV% shell input keyevent 224 >nul 2>&1
adb -s %TARGET_DEV% shell input keyevent 82 >nul 2>&1

REM 4. KIEM TRA MAY CHU METRO (PORT 8085)
echo [*] Dang kiem tra may chu POS Metro (Port 8085)...
netstat -ano | findstr ":8085" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Dang bat Expo Metro Server trong cua so rieng...
    start "OngChu POS Expo Server" cmd /k "cd /d D:\duanpos-ongchu\frontend && npm run dev"
    ping 127.0.0.1 -n 6 >nul
) else (
    echo [OK] May chu POS dang hoat dong tai port 8085.
)
echo.

REM 5. TU DONG VAO EXPO GO VA NAP THANG DU AN
echo [*] Dang tu dong nap du an vao Expo Go tren Tablet...
adb -s %TARGET_DEV% shell am start -a android.intent.action.VIEW -d "exp://localhost:8085" host.exp.exponent >nul 2>&1
ping 127.0.0.1 -n 2 >nul
adb -s %TARGET_DEV% shell input keyevent 4 >nul 2>&1
adb -s %TARGET_DEV% shell am start -a android.intent.action.VIEW -d "exp://localhost:8085" host.exp.exponent >nul 2>&1

echo.
echo =======================================================================
echo    HOAN TAT! TABLET DA TU DONG VAO EXPO DU AN ONGCHU POS!
echo =======================================================================
echo.
ping 127.0.0.1 -n 4 >nul
exit