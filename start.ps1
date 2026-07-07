#!/usr/bin/env pwsh
# Start POS F&B — local dev
# Usage: .\start.ps1
# Kill old processes on port 8000/8081, start backend + frontend.

$ErrorActionPreference = "Stop"

function Info { param([string]$m) Write-Host "[posa] $m" -ForegroundColor Cyan }
function Ok   { param([string]$m) Write-Host "[posa] $m" -ForegroundColor Green }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# ─── 1. Kill processes on ports 8000, 8081 ───
$ports = @(8000, 8081)
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $ports } | ForEach-Object {
    try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Ok "Killed PID $($_.OwningProcess) (port $($_.LocalPort))" } catch {}
}
Start-Sleep -Seconds 1

# ─── 2. Start Backend ───
Info "Starting Backend (uvicorn) on port 8000..."
Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root\backend'; `$env:PYTHONIOENCODING='utf-8'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

# ─── 3. Wait for backend ───
for ($i = 0; $i -lt 15; $i++) {
    try { $r = curl.exe -s http://localhost:8000/healthz 2>$null; if ($r -match '"ok"') { Ok "Backend healthy on :8000"; break } } catch {}
    Start-Sleep -Seconds 1
}

# ─── 4. Start Frontend ───
$frontendDir = "$root\frontend"
if (Test-Path "$frontendDir\package.json") {
    Info "Starting Frontend (Expo) on port 8081..."
    Start-Process powershell -WindowStyle Normal -ArgumentList @(
        "-NoExit", "-Command",
        "cd '$frontendDir'; npx expo start --web"
    )
}

Ok "───────────────────────────"
Ok "  Backend : http://localhost:8000"
Ok "  Frontend: http://localhost:8081"
Ok "  API docs: http://localhost:8000/docs"
Ok "───────────────────────────"
