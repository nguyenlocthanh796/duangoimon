$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (P1 files) ==="
$paths = @(
  "app/core/thue/tier.py",
  "app/core/thue/threshold.py",
  "app/core/thue/scheduler.py",
  "app/api/v1/thue/profile.py",
  "app/api/v1/thue/__init__.py",
  "app/core/rbac.py",
  "app/main.py",
  "tests/test_thue_tier.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
python -c "import app.main; print('MAIN_IMPORT_OK')" 2>&1
Write-Host "=== TIER TEST ==="
python -m pytest tests/test_thue_tier.py -q 2>&1 | Select-Object -Last 12
