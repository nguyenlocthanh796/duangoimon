$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (P7 files) ==="
$paths = @(
  "app/core/thue/report_export.py",
  "tests/test_report_export.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
python -c "from app.core.thue.report_export import build_report; print('REPORT_IMPORT_OK')" 2>&1
Write-Host "=== TESTS (test_report_export) ==="
python -m pytest tests/test_report_export.py -q 2>&1 | Select-Object -Last 3
