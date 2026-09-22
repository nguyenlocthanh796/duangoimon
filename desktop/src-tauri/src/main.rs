#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod printer;
use printer::{kick_cash_drawer, print_escpos_receipt, PrintReceiptPayload};

#[tauri::command]
fn print_receipt(payload: PrintReceiptPayload) -> Result<String, String> {
    print_escpos_receipt(&payload)?;
    Ok("In hóa đơn thành công".into())
}

#[tauri::command]
fn open_cash_drawer(printer_ip: Option<String>) -> Result<String, String> {
    kick_cash_drawer(printer_ip.as_deref())?;
    Ok("Đã mở két tiền".into())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![print_receipt, open_cash_drawer])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
