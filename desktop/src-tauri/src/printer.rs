use serde::{Deserialize, Serialize};
use std::io::Write;
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct PrintReceiptPayload {
    pub store_name: String,
    pub store_address: String,
    pub table_name: String,
    pub order_code: String,
    pub cashier_name: String,
    pub items: Vec<PrintReceiptItem>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub final_amount: f64,
    pub footer_text: String,
    pub printer_ip: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrintReceiptItem {
    pub name: String,
    pub qty: f64,
    pub price: f64,
    pub total: f64,
}

/// Loại bỏ dấu tiếng Việt chuẩn cho máy in nhiệt ESC/POS không hỗ trợ Unicode
pub fn remove_vietnamese_diacritics(s: &str) -> String {
    let mut res = String::with_capacity(s.len());
    for c in s.chars() {
        let mapped = match c {
            'à' | 'á' | 'ả' | 'ã' | 'ạ' | 'ă' | 'ắ' | 'ằ' | 'ẳ' | 'ẵ' | 'ặ' | 'â' | 'ấ' | 'ầ' | 'ẩ' | 'ẫ' | 'ậ' => 'a',
            'À' | 'Á' | 'Ả' | 'Ã' | 'Ạ' | 'Ă' | 'Ắ' | 'Ằ' | 'Ẳ' | 'Ẵ' | 'Ặ' | 'Â' | 'Ấ' | 'Ầ' | 'Ẩ' | 'Ẫ' | 'Ậ' => 'A',
            'è' | 'é' | 'ẻ' | 'ẽ' | 'ẹ' | 'ê' | 'ế' | 'ề' | 'ể' | 'ễ' | 'ệ' => 'e',
            'È' | 'É' | 'Ẻ' | 'Ẽ' | 'Ẹ' | 'Ê' | 'Ế' | 'Ề' | 'Ể' | 'Ễ' | 'Ệ' => 'E',
            'ì' | 'í' | 'ỉ' | 'ĩ' | 'ị' => 'i',
            'Ì' | 'Í' | 'Ỉ' | 'Ĩ' | 'Ị' => 'I',
            'ò' | 'ó' | 'ỏ' | 'õ' | 'ọ' | 'ô' | 'ố' | 'ồ' | 'ổ' | 'ỗ' | 'ộ' | 'ơ' | 'ớ' | 'ờ' | 'ở' | 'ỡ' | 'ợ' => 'o',
            'Ò' | 'Ó' | 'Ỏ' | 'Õ' | 'Ọ' | 'Ô' | 'Ố' | 'Ồ' | 'Ổ' | 'Ỗ' | 'Ộ' | 'Ơ' | 'Ớ' | 'Ờ' | 'Ở' | 'Ỡ' | 'Ợ' => 'O',
            'ù' | 'ú' | 'ủ' | 'ũ' | 'ụ' | 'ư' | 'ứ' | 'ừ' | 'ử' | 'ữ' | 'ự' => 'u',
            'Ù' | 'Ú' | 'Ủ' | 'Ũ' | 'Ụ' | 'Ư' | 'Ứ' | 'Ừ' | 'Ử' | 'Ữ' | 'Ự' => 'U',
            'ỳ' | 'ý' | 'ỷ' | 'ỹ' | 'ỵ' => 'y',
            'Ỳ' | 'Ý' | 'Ỷ' | 'Ỹ' | 'Ỵ' => 'Y',
            'đ' => 'd',
            'Đ' => 'D',
            other => {
                if (other as u32) < 128 {
                    other
                } else {
                    ' '
                }
            }
        };
        res.push(mapped);
    }
    res
}

/// Gửi byte payload trực tiếp qua TCP Socket port 9100 đến máy in nhiệt
fn send_to_printer(printer_ip: Option<&str>, data: &[u8]) -> Result<(), String> {
    let ip = printer_ip.unwrap_or("192.168.1.200");
    let addr_str = if ip.contains(':') {
        ip.to_string()
    } else {
        format!("{}:9100", ip)
    };

    let socket_addr: SocketAddr = addr_str
        .parse()
        .map_err(|e| format!("Địa chỉ máy in không hợp lệ ({}): {}", addr_str, e))?;

    let mut stream = TcpStream::connect_timeout(&socket_addr, Duration::from_millis(1200))
        .map_err(|e| format!("Không thể kết nối máy in nhiệt tại {}: {}", addr_str, e))?;

    stream
        .set_write_timeout(Some(Duration::from_millis(1500)))
        .map_err(|e| e.to_string())?;

    stream
        .write_all(data)
        .map_err(|e| format!("Lỗi gửi dữ liệu máy in: {}", e))?;

    stream.flush().map_err(|e| format!("Lỗi flush socket: {}", e))?;
    Ok(())
}

/// Gửi lệnh kích mở ngăn kéo đựng tiền mặt (Cash Drawer Kick via ESC/POS \x1b\x70\x00\x19\xfa)
pub fn kick_cash_drawer(printer_ip: Option<&str>) -> Result<(), String> {
    let command: [u8; 5] = [0x1B, 0x70, 0x00, 0x19, 0xFA];
    println!("⚡ Cash Drawer Kick signal triggered!");
    send_to_printer(printer_ip, &command)
}

/// In hóa đơn nhiệt Raw ESC/POS siêu tốc (< 50ms) không hiện hộp thoại Windows
pub fn print_escpos_receipt(payload: &PrintReceiptPayload) -> Result<(), String> {
    println!("🖨️ Printing ESC/POS Receipt for Order: {}", payload.order_code);
    let mut buffer: Vec<u8> = Vec::with_capacity(1024);

    // 1. Initialize Printer (ESC @)
    buffer.extend_from_slice(&[0x1B, 0x40]);

    // 2. Center Align (ESC a 1)
    buffer.extend_from_slice(&[0x1B, 0x61, 0x01]);

    // 3. Store Name (Double Height & Double Width: GS ! 0x11)
    buffer.extend_from_slice(&[0x1D, 0x21, 0x11]);
    buffer.extend_from_slice(remove_vietnamese_diacritics(&payload.store_name).as_bytes());
    buffer.push(0x0A);

    // 4. Normal Font for Address & Header
    buffer.extend_from_slice(&[0x1D, 0x21, 0x00]);
    if !payload.store_address.is_empty() {
        buffer.extend_from_slice(remove_vietnamese_diacritics(&payload.store_address).as_bytes());
        buffer.push(0x0A);
    }
    buffer.extend_from_slice(b"--------------------------------\n");

    // 5. Left Align metadata
    buffer.extend_from_slice(&[0x1B, 0x61, 0x00]);
    buffer.extend_from_slice(format!("So Ban: {}\n", remove_vietnamese_diacritics(&payload.table_name)).as_bytes());
    buffer.extend_from_slice(format!("Ma Don: {}\n", payload.order_code).as_bytes());
    buffer.extend_from_slice(format!("Thu Ngan: {}\n", remove_vietnamese_diacritics(&payload.cashier_name)).as_bytes());
    buffer.extend_from_slice(b"================================\n");

    // 6. Items List
    for it in &payload.items {
        let clean_name = remove_vietnamese_diacritics(&it.name);
        buffer.extend_from_slice(format!("{}\n", clean_name).as_bytes());
        buffer.extend_from_slice(
            format!("  {:.0} x {:>9.0} = {:>10.0}\n", it.qty, it.price, it.total).as_bytes(),
        );
    }

    buffer.extend_from_slice(b"--------------------------------\n");

    // 7. Right Align financial summary
    buffer.extend_from_slice(&[0x1B, 0x61, 0x02]);
    buffer.extend_from_slice(format!("Tam tinh: {:>12.0} d\n", payload.total_amount).as_bytes());
    if payload.discount_amount > 0.0 {
        buffer.extend_from_slice(format!("Giam gia: -{:>11.0} d\n", payload.discount_amount).as_bytes());
    }
    buffer.extend_from_slice(&[0x1D, 0x21, 0x01]); // Double Height for final total
    buffer.extend_from_slice(format!("TONG CONG: {:>10.0} d\n", payload.final_amount).as_bytes());
    buffer.extend_from_slice(&[0x1D, 0x21, 0x00]); // Reset normal font

    // 8. Footer (Center align)
    buffer.extend_from_slice(&[0x1B, 0x61, 0x01]);
    buffer.extend_from_slice(b"\n");
    if !payload.footer_text.is_empty() {
        buffer.extend_from_slice(remove_vietnamese_diacritics(&payload.footer_text).as_bytes());
        buffer.extend_from_slice(b"\n");
    }
    buffer.extend_from_slice(b"Cam on Quy Khach - Hen Gap Lai!\n\n\n");

    // 9. Kick Cash Drawer & Auto Cut Paper (\x1d\x56\x41\x10)
    buffer.extend_from_slice(&[0x1B, 0x70, 0x00, 0x19, 0xFA]);
    buffer.extend_from_slice(&[0x1D, 0x56, 0x41, 0x10]);

    println!("✅ Receipt buffer prepared (Total bytes: {})", buffer.len());
    send_to_printer(payload.printer_ip.as_deref(), &buffer)
}
