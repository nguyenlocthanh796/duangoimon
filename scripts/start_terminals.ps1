# ==============================================================================
# ONGCHU LEAN POS - DIEU PHOI 5 THIET BI MOBILE (SAMSUNG & IPHONE 11+)
# File: scripts/start_terminals.ps1
# ==============================================================================

param(
    [string]$Action = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "ONGCHU LEAN POS - DIEU PHOI 5 THIET BI MOBILE"

$ProjectDir = "D:\duanpos-ongchu"
$AdbPath = "D:\tools\platform-tools\adb.exe"
if (-not (Test-Path $AdbPath)) {
    $AdbPath = "D:\AndroidSDK\platform-tools\adb.exe"
}
$EmuPath = "D:\AndroidSDK\emulator\emulator.exe"

# Danh sach thiet bi chuan Samsung va iPhone 11 tro len
$DevicePool = @(
    @{
        Name = "iPhone 14"
        Brand = "Apple"
        Width = 390
        Height = 844
        UserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
    },
    @{
        Name = "iPhone 15 Pro"
        Brand = "Apple"
        Width = 393
        Height = 852
        UserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
    },
    @{
        Name = "iPhone 11 / XR"
        Brand = "Apple"
        Width = 414
        Height = 896
        UserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    },
    @{
        Name = "iPhone 15 Pro Max"
        Brand = "Apple"
        Width = 430
        Height = 932
        UserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
    },
    @{
        Name = "Samsung Galaxy S24"
        Brand = "Samsung"
        Width = 384
        Height = 854
        UserAgent = "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
    },
    @{
        Name = "Samsung Galaxy S24 Ultra"
        Brand = "Samsung"
        Width = 412
        Height = 915
        UserAgent = "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
    },
    @{
        Name = "Samsung Galaxy A54 5G"
        Brand = "Samsung"
        Width = 412
        Height = 915
        UserAgent = "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
    },
    @{
        Name = "Samsung Galaxy S23"
        Brand = "Samsung"
        Width = 360
        Height = 800
        UserAgent = "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
    }
)

# Tim trinh duyet Chrome hoac Edge
$BrowserPath = ""
$CandidateBrowsers = @(
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)
foreach ($path in $CandidateBrowsers) {
    if (Test-Path $path) {
        $BrowserPath = $path
        break
    }
}
if (-not $BrowserPath) {
    $BrowserPath = "msedge.exe"
}

function Check-Port($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

function Show-Menu {
    Clear-Host
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " ONGCHU LEAN POS - 5 THIET BI MOBILE CHUAN SAMSUNG VA IPHONE 11+" -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $backendLive = Check-Port 8080
    $metroLive = Check-Port 8085

    if ($backendLive) {
        Write-Host "   * Go Backend Engine (Port 8080)   : " -NoNewline
        Write-Host "[ DANG CHAY - HEALTHY ]" -ForegroundColor Green
    } else {
        Write-Host "   * Go Backend Engine (Port 8080)   : " -NoNewline
        Write-Host "[ DANG DUNG ]" -ForegroundColor Red
    }

    if ($metroLive) {
        Write-Host "   * Expo Metro Server (Port 8085)   : " -NoNewline
        Write-Host "[ DANG CHAY - HEALTHY ]" -ForegroundColor Green
    } else {
        Write-Host "   * Expo Metro Server (Port 8085)   : " -NoNewline
        Write-Host "[ DANG DUNG ]" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " CAC LUA CHON DIEU KHIEN:" -ForegroundColor White
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [1] KHOI DONG 5 THIET BI MOBILE NGAU NHIEN (Samsung & iPhone 11+ Viewports)" -ForegroundColor Green
    Write-Host "      - Tu dong chon 5 dong dien thoai ngau nhien tu Pool"
    Write-Host "      - Chuan Viewport, Touch Emulation & Mobile User-Agent chong lech layout"
    Write-Host "      - Sap xep 5 thiet bi dan deu tren man hinh 1080p"
    Write-Host ""
    Write-Host "  [2] KET NOI VA DONG BO ADB CHO THIET BI ANDROID (Pixel Phone & Tablet)" -ForegroundColor Yellow
    Write-Host "      - Dao cong mang (Reverse tcp:8085 & tcp:8080)"
    Write-Host "      - Kich hoat mo app Expo tren toan bo Android Emulators"
    Write-Host "      - San sang nhan lenh tu Antigravity MCP Server"
    Write-Host ""
    Write-Host "  [3] KHOI CHAY 2 MAY AO ANDROID QEMU (Pixel 7 Phone & Pixel Tablet POS)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [4] CHAY BO KIEM THU TU DONG TOAN DU AN (Master Test Suite 308 Tests)" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  [5] DONG TAT CA CAC CUA SO MAN HINH AO DANG MO" -ForegroundColor Red
    Write-Host ""
    Write-Host "  [0] THOAT" -ForegroundColor Gray
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
}

function Start-Terminals {
    Write-Host ""
    Write-Host "[*] Dang kiem tra dich vu Backend & Frontend..." -ForegroundColor Cyan

    if (-not (Check-Port 8080)) {
        Write-Host "[*] Khoi dong Go Backend Engine tai port 8080..." -ForegroundColor Yellow
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c server.exe" -WorkingDirectory "$ProjectDir\backend" -WindowStyle Minimized
        Start-Sleep -Seconds 2
    }

    if (-not (Check-Port 8085)) {
        Write-Host "[*] Khoi dong Expo Metro Server tai port 8085..." -ForegroundColor Yellow
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx expo start --port 8085 -c" -WorkingDirectory "$ProjectDir\frontend" -WindowStyle Minimized
        Start-Sleep -Seconds 4
    }

    # Lay do phan giai man hinh chinh
    $screenWidth = 1920
    $screenHeight = 1080
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        if ($bounds.Width -gt 0) {
            $screenWidth = $bounds.Width
            $screenHeight = $bounds.Height
        }
    } catch {}

    # Chon 5 thiet bi ngau nhien tu Pool
    $selectedDevices = $DevicePool | Get-Random -Count 5

    # 5 vai tro nghiep vu
    $roles = @(
        @{ Title = "Quay Thu Ngan"; Url = "http://localhost:8085/"; Profile = "cashier" },
        @{ Title = "Bep & Bar KDS"; Url = "http://localhost:8085/kds"; Profile = "kds" },
        @{ Title = "Phuc Vu Ban"; Url = "http://localhost:8085/"; Profile = "waiter1" },
        @{ Title = "Man Phu Khach CFD"; Url = "http://localhost:8085/cfd"; Profile = "cfd" },
        @{ Title = "So Don & Giao Ca"; Url = "http://localhost:8085/giao-ca"; Profile = "manager" }
    )

    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " 5 THIET BI MOBILE DUOC CHON (CHUAN SAMSUNG VA IPHONE 11+):" -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan

    $temp = $env:TEMP
    for ($i = 0; $i -lt 5; $i++) {
        $dev = $selectedDevices[$i]
        $role = $roles[$i]

        # Kich thuoc cua so Windows bao gom vien (~16px rong, ~36px cao)
        $winW = [int]$dev.Width + 16
        $winH = [Math]::Min([int]$dev.Height + 36, $screenHeight - 50)

        # Tinh toan toa do X de 5 thiet bi dan deu tren man hinh
        $maxOffset = [Math]::Max(0, $screenWidth - $winW)
        $posX = [int]($i * ($maxOffset / 4))

        $lineStr = "  [{0}/5] {1} : {2} ({3}x{4}) [{5}]" -f ($i + 1), $role.Title.PadRight(18), $dev.Name.PadRight(22), $dev.Width, $dev.Height, $dev.Brand
        Write-Host $lineStr -ForegroundColor Green

        # Cau hinh tham so Chrome / Edge Mobile Emulation
        $appArg = "--app=" + $role.Url
        $sizeArg = "--window-size={0},{1}" -f $winW, $winH
        $posArg = "--window-position={0},0" -f $posX
        $uaArg = '--user-agent="' + $dev.UserAgent + '"'
        $dataDirArg = '--user-data-dir="' + $temp + '\ongchu_mobile_term_' + $role.Profile + '"'

        $allArgs = @(
            $appArg,
            $sizeArg,
            $posArg,
            "--use-mobile-user-agent",
            $uaArg,
            "--touch-events=enabled",
            "--enable-viewport",
            $dataDirArg
        ) -join " "

        Start-Process $BrowserPath -ArgumentList $allArgs
    }

    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "[OK] Da khoi dong thanh cong 5 thiet bi dien thoai chuan Viewport!" -ForegroundColor Green
    Write-Host "[*] Tat ca 5 thiet bi dong bo realtime qua WebSocket va nhan dien chuan Mobile." -ForegroundColor Cyan
    Write-Host ""
}

function Sync-Adb {
    Write-Host ""
    Write-Host "[*] Dang quet danh sach thiet bi Android qua ADB..." -ForegroundColor Cyan
    if (-not (Test-Path $AdbPath)) {
        Write-Host "[!] Khong tim thay adb.exe tai $AdbPath" -ForegroundColor Red
        return
    }

    & $AdbPath devices -l
    Write-Host ""
    Write-Host "[*] Dang thiet lap Reverse Port (8085 & 8080) cho cac may ao Android..." -ForegroundColor Yellow
    
    $rawDevices = & $AdbPath devices
    foreach ($line in $rawDevices) {
        if ($line -match "^(emulator-\d+)\s+device") {
            $dev = $matches[1]
            Write-Host "   * Cau hinh thiet bi: $dev" -ForegroundColor Green
            & $AdbPath -s $dev reverse tcp:8085 tcp:8085 2>$null
            & $AdbPath -s $dev reverse tcp:8080 tcp:8080 2>$null
            Write-Host "   * Khoi dong ung dung OngChu POS tren $dev..." -ForegroundColor Cyan
            & $AdbPath -s $dev shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8085" 2>$null
        }
    }
    Write-Host "[OK] Da ket noi ADB hoan tat!" -ForegroundColor Green
    Write-Host "[*] Antigravity MCP Server hien co the tuong tac truc tiep voi cac thiet bi nay." -ForegroundColor Cyan
    Write-Host ""
}

function Start-Emulators {
    Write-Host ""
    Write-Host "[*] Dang khoi chay may ao Pixel 7 Pro (Phone) va Pixel Tablet POS..." -ForegroundColor Cyan
    if (-not (Test-Path $EmuPath)) {
        Write-Host "[!] Khong tim thay emulator.exe tai $EmuPath" -ForegroundColor Red
        return
    }

    Start-Process $EmuPath -ArgumentList "-avd Pixel_7_Pro -port 5554 -no-boot-anim -no-audio" -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Start-Process $EmuPath -ArgumentList "-avd Pixel_Tablet_POS -port 5556 -no-boot-anim -no-audio" -WindowStyle Minimized

    Write-Host "[OK] Da gui lenh khoi dong 2 may ao Android. Hay cho 30-45 giay de boot xong." -ForegroundColor Green
    Write-Host ""
}

function Run-AllTests {
    Write-Host ""
    Write-Host "[*] Dang thuc thi Master Test Suite (Frontend & Backend Alignment)..." -ForegroundColor Magenta
    Set-Location "$ProjectDir\frontend"
    & npx tsx tests/run_all_tests.ts
    Write-Host ""
}

function Stop-Terminals {
    Write-Host ""
    Write-Host "[*] Dang dong cac cua so man hinh ao..." -ForegroundColor Yellow
    Get-CimInstance Win32_Process | Where-Object { 
        $_.CommandLine -match "ongchu_term_" -or $_.CommandLine -match "ongchu_mobile_term_"
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Da don dep cac man hinh ao!" -ForegroundColor Green
    Write-Host ""
}

if ($Action -ne "") {
    switch ($Action) {
        "1" { Start-Terminals }
        "2" { Sync-Adb }
        "3" { Start-Emulators }
        "4" { Run-AllTests }
        "5" { Stop-Terminals }
        "0" { Write-Host "Tam biet!"; exit 0 }
        default { Write-Host "Tham so Action khong hop le: $Action" -ForegroundColor Red; exit 1 }
    }
    exit 0
}

# Vong lap Menu chinh
while ($true) {
    Show-Menu
    $choice = Read-Host "Nhap lua chon cua ban (0-5)"
    switch ($choice) {
        "1" { Start-Terminals; Pause }
        "2" { Sync-Adb; Pause }
        "3" { Start-Emulators; Pause }
        "4" { Run-AllTests; Pause }
        "5" { Stop-Terminals; Pause }
        "0" { Write-Host "Tam biet!"; exit }
        default { Write-Host "Lua chon khong hop le, vui long thu lai." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
}