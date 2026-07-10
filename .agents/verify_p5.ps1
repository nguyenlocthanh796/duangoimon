$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (P5 files) ==="
$paths = @(
  "app/api/v1/thue/bank.py",
  "app/api/v1/thue/__init__.py",
  "app/main.py",
  "tests/test_bank_account.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
python -c "import app.main; print('MAIN_IMPORT_OK')" 2>&1
Write-Host "=== TESTS (all) ==="
python -m pytest tests/ -q 2>&1 | Select-Object -Last 3
