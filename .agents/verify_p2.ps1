$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (P2 files) ==="
$paths = @(
  "app/models/quan_ly.py",
  "app/core/thue/weighted_average.py",
  "app/core/thue/data_lock.py",
  "app/core/thue/scheduler.py",
  "app/core/retention.py",
  "tests/test_weighted_average.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
python -c "import app.core.thue.weighted_average, app.core.thue.data_lock, app.core.retention; print('IMPORT_OK')" 2>&1
Write-Host "=== TESTS ==="
python -m pytest tests/test_thue_tier.py tests/test_weighted_average.py -q 2>&1 | Select-Object -Last 4
