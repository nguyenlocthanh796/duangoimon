import subprocess
import os

ps_code = """
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

function Get-OcrText($filePath) {
    $fullPath = [System.IO.Path]::GetFullPath($filePath)
    $file = [Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath).GetAwaiter().GetResult()
    $stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).GetAwaiter().GetResult()
    $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
    $bitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    $result = $engine.RecognizeAsync($bitmap).GetAwaiter().GetResult()
    return $result.Text
}

$files = @(
    '01_pos_table_overview.png',
    '02_pos_menu_ordering.png',
    '03_pos_modifier_toppings.png',
    '04_pos_cart_tray.png',
    '05_pos_numpad_cash.png',
    '06_pos_dynamic_vietqr.png',
    '07_pos_kds_kitchen.png',
    '08_pos_invoices_history.png',
    '09_pos_cashflow_expenses.png',
    '10_pos_shift_handover.png',
    '11_pos_pnl_report.png',
    '12_pos_settings_printer.png'
)

foreach ($f in $files) {
    $p = ".temp/annotated_screens/" + $f
    if (Test-Path $p) {
        $txt = Get-OcrText $p
        Write-Output ("=== " + $f + " ===")
        Write-Output $txt
    }
}
"""

os.makedirs('.temp', exist_ok=True)
with open('.temp/run_ocr.ps1', 'w', encoding='utf-8') as f:
    f.write(ps_code)

res = subprocess.run(['powershell', '-ExecutionPolicy', 'Bypass', '-File', '.temp/run_ocr.ps1'], capture_output=True, text=True, encoding='utf-8')
with open('.temp/ocr_full.txt', 'w', encoding='utf-8') as f:
    f.write(res.stdout)
print("OCR Completed! Length:", len(res.stdout))
