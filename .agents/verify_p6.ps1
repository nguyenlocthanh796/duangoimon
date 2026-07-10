$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (P6 files) ==="
$paths = @(
  "app/core/thue/tax_calc.py",
  "tests/test_tax_calc.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
python -c "from app.core.thue.tax_calc import compute_tax; print('TAX_IMPORT_OK')" 2>&1
Write-Host "=== TESTS (test_tax_calc) ==="
python -m pytest tests/test_tax_calc.py -q 2>&1 | Select-Object -Last 3
