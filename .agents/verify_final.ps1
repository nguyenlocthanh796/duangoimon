$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (thue core) ==="
foreach ($f in @("app/core/thue/tax_calc.py","app/core/thue/report_export.py","app/api/v1/thue/bank.py","app/main.py")) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== FULL TEST SUITE ==="
python -m pytest tests/ -q 2>&1 | Select-Object -Last 3
