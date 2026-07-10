$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (P3 files) ==="
$paths = @(
  "app/integrations/einvoice.py",
  "app/api/v1/thue/cash_register_invoice.py",
  "app/api/v1/thue/__init__.py",
  "app/core/thue/cash_invoice_service.py",
  "app/api/v1/ban_hang/payments.py",
  "app/main.py",
  "tests/test_cash_register_invoice.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
python -c "import app.main; print('MAIN_IMPORT_OK')" 2>&1
Write-Host "=== TESTS (P1+P2+P3) ==="
python -m pytest tests/test_thue_tier.py tests/test_weighted_average.py tests/test_cash_register_invoice.py -q 2>&1 | Select-Object -Last 4
