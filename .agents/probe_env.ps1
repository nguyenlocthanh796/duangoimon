$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
Write-Host "FLAKE8:" (flake8 --version 2>&1 | Out-String).Trim()
if (Test-Path 'C:\Program Files\PostgreSQL') {
  Write-Host "PG_DIR:" (Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory | ForEach-Object { $_.Name }) -join ','
} else {
  Write-Host "NO_PG_DIR"
}
# Look for any running postgres server
$svc = Get-Process -Name 'postgres*' -ErrorAction SilentlyContinue
if ($svc) { Write-Host "PG_PROC_RUNNING" } else { Write-Host "PG_PROC_NONE" }
