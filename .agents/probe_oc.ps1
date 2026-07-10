try {
  $m = Invoke-RestMethod -Uri "http://localhost:20128/v1/models" -TimeoutSec 5 -ErrorAction Stop
  $oc = ($m.data | Where-Object { $_.id -like 'oc/*' } | ForEach-Object { $_.id })
  Write-Host ("OC_MODELS_FOUND " + $oc.Count)
  $oc | ForEach-Object { Write-Host $_ }
  if ($oc.Count -eq 0) { Write-Host "NO_OC_MODELS" }
} catch {
  Write-Host ("MODELS_ERR " + $_.Exception.Message)
}
