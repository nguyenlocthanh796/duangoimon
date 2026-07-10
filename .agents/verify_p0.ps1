$p = "$env:APPDATA\Python\Python314\Scripts"
$env:Path = "$p;$env:Path"
$b = "e:\posa\backend"
Set-Location $b
$env:PYTHONPATH = $b
Write-Host "=== FLAKE8 (new files, .flake8 in backend) ==="
$paths = @(
  "app\models\thue\hkd_profile.py",
  "app\models\thue\bank_account.py",
  "app\models\thue\declaration_deadline.py",
  "app\models\ke_toan.py",
  "app\models\all_models.py"
)
foreach ($f in $paths) {
  $out = flake8 $f 2>&1
  if ($LASTEXITCODE -eq 0) { Write-Host "OK   $f" } else { Write-Host "FAIL $f"; Write-Host $out }
}
Write-Host "=== IMPORT CHECK ==="
$r = python -c "import app.models.all_models; print('IMPORT_OK')" 2>&1
Write-Host $r
