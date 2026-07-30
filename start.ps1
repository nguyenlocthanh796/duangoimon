#!/usr/bin/env pwsh
# POS F&B start script
# If execution policy blocks: powershell -ExecutionPolicy Bypass -File start.ps1

param(
  [switch]$Build,
  [switch]$Serve
)

$ErrorActionPreference = "Stop"

function Info { param([string]$m) Write-Host "[posa] $m" -ForegroundColor Cyan }
function Warn { param([string]$m) Write-Host "[posa] $m" -ForegroundColor Yellow }
function Ok   { param([string]$m) Write-Host "[posa] $m" -ForegroundColor Green }
function Die  { param([string]$m) Write-Host "[posa] $m" -ForegroundColor Red; exit 1 }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# -- Kill old on ports --
$ports = @(3000, 8000, 8081)
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $ports } | ForEach-Object {
  try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Ok "Killed PID $($_.OwningProcess) (port $($_.LocalPort))" } catch {}
}
Start-Sleep -Seconds 1

# -- Load .env file --
$envFile = "$root\\.env"
if (-not (Test-Path $envFile)) { Die "File env '$envFile' is missing." }

Info "Loading environment variables from '$((Get-Item $envFile).Name)'..."
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#")) {
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) {
      $key = $parts[0].Trim()
      $val = $parts[1].Trim()
      if ($key) {
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
      }
    }
  }
}

# -- Backend --
Info "Starting Backend (uvicorn) on port 8000..."
Start-Process powershell -WindowStyle Normal -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\backend'; `$env:PYTHONPATH='$root'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

for ($i = 0; $i -lt 15; $i++) {
  try { $r = curl.exe -s http://localhost:8000/healthz 2>$null; if ($r -match '"ok"') { Ok "Backend healthy on :8000"; break } } catch {}
  Start-Sleep -Seconds 1
}

$frontendDir = "$root\frontend"

# -- Production build --
if ($Build) {
  if (-not (Test-Path "$frontendDir\node_modules")) { Die "node_modules missing. Run 'cd frontend; npm install' first." }
  Info "Building production bundle (expo export)..."
  Push-Location $frontendDir
  try {
    npx expo export --platform web
    Ok "Build complete. Dist at $frontendDir\dist"
  } finally { Pop-Location }
}

# -- Production serve (dist/) --
if ($Build -or $Serve) {
  $distPath = "$frontendDir\dist"
  if (-not (Test-Path $distPath)) { Die "dist/ not found. Run: .\start.ps1 -Build" }

  $hasHttpServer = Get-Command http-server -ErrorAction SilentlyContinue
  if (-not $hasHttpServer) {
    Info "Installing http-server globally..."
    npm install --global http-server
  }

  Info "Serving production build on port 3000..."
  Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoExit", "-Command",
    "http-server '$distPath' -p 3000 -g --cors -o"
  )

  Ok "==========================="
  Ok "  Production : http://localhost:3000"
  Ok "  Backend    : http://localhost:8000"
  Ok "  API docs   : http://localhost:8000/docs"
  Ok "==========================="
  return
}

# -- Dev mode (Expo hot-reload) --
Info "Starting Frontend (Expo dev) on port 8081..."
Start-Process powershell -WindowStyle Normal -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$frontendDir'; npx expo start --web"
)

Ok "==========================="
Ok "  Backend : http://localhost:8000"
Ok "  Frontend: http://localhost:8081 (dev mode)"
Ok "  API docs: http://localhost:8000/docs"
Ok "==========================="
