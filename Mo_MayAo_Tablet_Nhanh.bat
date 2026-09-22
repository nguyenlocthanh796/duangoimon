@echo off
title KHOI CHAY MAY AO TABLET (GOOGLE PIXEL TABLET - ANDROID 13)
color 0a

echo =======================================================================
echo     KHOI CHAY MAY AO TABLET - GOOGLE PIXEL TABLET (ANDROID 13)
echo =======================================================================
echo.
echo [*] GPU: NVIDIA GeForce GTX 1070 Ti (Vulkan / Direct3D 60FPS)
echo [*] RAM: 4GB ^| CPU: 4 Cores ^| Man hinh: 2560x1600
echo [*] Dang mo cua so May ao Tablet Emulator tren Desktop...
echo.

set "ANDROID_HOME=D:\AndroidSDK"
set "JAVA_HOME=D:\AndroidSDK\jdk-17"
set "PATH=D:\AndroidSDK\jdk-17\bin;D:\AndroidSDK\emulator;D:\AndroidSDK\platform-tools;%PATH%"

start "" "D:\AndroidSDK\emulator\emulator.exe" -avd Pixel_Tablet_POS -gpu host -no-metrics

echo [OK] May ao Pixel Tablet da duoc khoi dong thanh cong!
echo      Cua so may ao se xuat hien tren man hinh trong vai giay.
echo.
timeout /t 3 >nul
exit