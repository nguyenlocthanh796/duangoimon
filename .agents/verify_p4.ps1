$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (P4 files) ==="
$paths = @(
  "app/core/thue/escalation.py",
  "app/api/v1/thue/declaration.py",
  "app/api/v1/thue/__init__.py",
  "app/core/thue/scheduler.py",
  "app/main.py",
  "tests/test_escalation.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
python -c "import app.main; print('MAIN_IMPORT_OK')" 2>&1
Write-Host "=== TESTS (all) ==="
python -m pytest tests/test_thue_tier.py tests/test_weighted_average.py tests/test_cash_register_invoice.py tests/test_escalation.py -q 2>&1 | Select-Object -Last 3
