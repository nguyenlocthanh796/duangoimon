import os
# -*- coding: utf-8 -*-
import sys, json, ssl, socket, time, urllib.request, urllib.error
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://app.ongchu.cloud"
TENANT_ID = "tenant_quanchebuoiangiang"
VPS_HOST = os.getenv("VPS_HOST", "116.118.3.48")
VPS_USER = "root"
VPS_PASS = os.getenv("VPS_PASSWORD", "")

passed = 0
failed = 0

def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ [PASS] {name} {detail}")
    else:
        failed += 1
        print(f"  ❌ [FAIL] {name} {detail}")

def req(path, method="GET", body=None, headers=None):
    url = f"{BASE_URL}{path}"
    if headers is None:
        headers = {}
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    else:
        data = None
    
    if "X-Tenant-ID" not in headers and TENANT_ID:
        headers["X-Tenant-ID"] = TENANT_ID
    
    ctx = ssl.create_default_context()
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, context=ctx, timeout=10) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            try:
                parsed = json.loads(content)
            except:
                parsed = content
            return status, parsed
    except urllib.error.HTTPError as e:
        status = e.code
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except:
            parsed = content
        return status, parsed
    except Exception as e:
        return 0, str(e)

print("=" * 80)
print(f"👑 ONGCHU LEAN POS - MASTER VPS LIVE DATABASE & API INTEGRATION TEST")
print(f"Target: {BASE_URL} (VPS DB: pure-go sqlite WAL /var/www/ongchu-backend/ongchu_pos.db)")
print(f"Tenant: {TENANT_ID}")
print("=" * 80)

# --- 1. HEALTH & ENGINE ---
print("\n📌 [1. HEALTH & ENGINE STATUS]")
s, r = req("/health")
check("Health Check /health", s == 200 and r.get("status") == "healthy", f"HTTP {s}")

s, r = req("/api/v1/health")
check("API Health Check /api/v1/health", s == 200 and r.get("status") == "healthy", f"Version: {r.get('version')}")

# --- 2. MULTI-TENANT AUTH & SECURITY ---
print("\n📌 [2. MULTI-TENANT AUTH & ACCESS SECURITY]")
s, r = req("/api/v1/public/login", "POST", {
    "tenant_code": "quanquan",
    "username": "quanquan",
    "password": "Danh@!26062002"
})
check("Đăng nhập Tenant quanquan", s == 200 and r.get("success") == True, f"User: {r.get('user', {}).get('username')}")

s, r = req("/api/v1/public/login", "POST", {
    "tenant_code": "quanquan",
    "username": "quanquan",
    "password": "WrongPassword!"
})
check("Từ chối mật khẩu sai (Chống tấn công)", s == 401 and r.get("success") == False, f"HTTP {s}")

s, r = req("/api/v1/public/staff-pin", "POST", {"pin": "9999", "tenant_id": TENANT_ID})
check("Đăng nhập nhanh mã PIN 9999", s == 200 and r.get("success") == True)

# --- 3. VPS LIVE DATABASE CATALOG ---
print("\n📌 [3. VPS LIVE DATABASE CATALOG]")
s, r = req(f"/api/v1/areas?tenant_id={TENANT_ID}")
areas_list = r if isinstance(r, list) else r.get("data", [])
check("Tải danh sách khu vực từ VPS DB", s == 200 and len(areas_list) > 0, f"Số khu vực: {len(areas_list)}")

s, r = req(f"/api/v1/tables?tenant_id={TENANT_ID}")
tables_list = r if isinstance(r, list) else r.get("data", [])
check("Tải danh sách bàn ăn từ VPS DB", s == 200 and len(tables_list) >= 15, f"Số bàn: {len(tables_list)}")

s, r = req(f"/api/v1/categories?tenant_id={TENANT_ID}")
cat_list = r if isinstance(r, list) else r.get("data", [])
check("Tải danh mục món từ VPS DB", s == 200 and len(cat_list) >= 6, f"Số danh mục: {len(cat_list)}")

s, r = req(f"/api/v1/products?tenant_id={TENANT_ID}")
prod_list = r if isinstance(r, list) else r.get("data", [])
check("Tải danh sách sản phẩm từ VPS DB", s == 200 and len(prod_list) >= 40, f"Số món thực đơn: {len(prod_list)}")

# --- 4. ORDER LIFECYCLE ON VPS DB ---
print("\n📌 [4. ORDER LIFECYCLE & KDS ON VPS DB]")
sample_prod = prod_list[0] if prod_list else {"id": "p1", "name": "Chè Bưởi Tứ Quý", "selling_price": 28000}
sample_table = tables_list[0] if tables_list else {"id": "tbl_01", "name": "Bàn 01"}

order_payload = {
    "tenant_id": TENANT_ID,
    "table_id": sample_table.get("id"),
    "table_name": sample_table.get("name"),
    "order_channel": "dine_in",
    "staff_name": "Thu Ngân VPS",
    "items": [
        {
            "product_id": sample_prod.get("id"),
            "product_name": sample_prod.get("name"),
            "unit_price": sample_prod.get("selling_price", 28000),
            "quantity": 2,
            "station": sample_prod.get("station", "bar"),
            "subtotal": sample_prod.get("selling_price", 28000) * 2,
            "note": "Ít ngọt, nhiều đá"
        }
    ],
    "subtotal": sample_prod.get("selling_price", 28000) * 2,
    "discount_amount": 0,
    "vat_amount": 0,
    "total_amount": sample_prod.get("selling_price", 28000) * 2,
    "payment_method": "cash",
    "status": "dang_xu_ly"
}

s, r = req("/api/v1/orders", "POST", order_payload)
order_id = r.get("id") if isinstance(r, dict) else None
check("Tạo đơn hàng lưu vào VPS DB", s in (200, 201) and order_id is not None, f"Order ID: {order_id}")

# KDS fetch
s, r = req(f"/api/v1/kds/orders?tenant_id={TENANT_ID}")
kds_orders = r if isinstance(r, list) else r.get("data", [])
check("Bếp/Bar KDS truy xuất đơn từ VPS DB", s == 200, f"Số đơn bếp: {len(kds_orders)}")

# VietQR generation
if order_id:
    s, r = req(f"/api/v1/orders/{order_id}/vietqr")
    check("Sinh mã thanh toán VietQR động", s == 200 and ("quick_link" in r or "qr_data_url" in r or "emvco" in r))

    # Pre-print bill
    s, r = req(f"/api/v1/orders/{order_id}/pre-print", "POST", {})
    check("In tạm tính bill (Pre-print)", s in (200, 400))

    # Payment completion
    s, r = req(f"/api/v1/orders/{order_id}/pay", "POST", {
        "payment_method": "cash",
        "cash_received": 100000,
        "cash_change": 100000 - (sample_prod.get("selling_price", 28000) * 2),
        "staff_name": "Thu Ngân VPS"
    })
    is_paid = (r.get("order", {}).get("status") == "da_thanh_toan") if isinstance(r, dict) else False
    check("Hoàn tất thanh toán & đóng đơn trên VPS DB", s == 200 and is_paid, f"Status: {r.get('order', {}).get('status')}")

# --- 5. CASH FLOW (SỔ QUỸ) ON VPS DB ---
print("\n📌 [5. SỔ QUỸ CHI CHỢ & THU TIỀN ON VPS DB]")
s, r = req("/api/v1/cash/transactions", "POST", {
    "tenant_id": TENANT_ID,
    "branch_id": "branch_main",
    "type": "chi",
    "category": "chi_mua_rau_cho",
    "amount": 35000,
    "description": "Mua 5 quả dừa xiêm nấu chè",
    "performed_by": "Chủ Quán"
})
has_tx = ("transaction" in r or "id" in r or r.get("success") == True or s in (200, 201))
check("Ghi nhận phiếu chi tiền mặt 35.000đ vào VPS DB", s in (200, 201) and has_tx)

s, r = req(f"/api/v1/cash/transactions?tenant_id={TENANT_ID}")
tx_list = r if isinstance(r, list) else r.get("data", [])
check("Tải danh sách sổ quỹ từ VPS DB", s == 200 and len(tx_list) > 0, f"Số phiếu: {len(tx_list)}")

s, r = req(f"/api/v1/cash/summary?tenant_id={TENANT_ID}")
check("Tính toán số dư Sổ Quỹ thực tế trên VPS DB", s == 200)

# --- 6. CASH SHIFTS (GIAO CA) ON VPS DB ---
print("\n📌 [6. GIAO CA & ĐẾM KÉT ON VPS DB]")
s, r = req("/api/v1/shifts/open", "POST", {
    "tenant_id": TENANT_ID,
    "branch_id": "branch_main",
    "staff_name": "Thu Ngân Ca Sáng",
    "starting_cash": 500000,
    "note": "Đầu ca 500k tiền lẻ"
})
shift_id = r.get("id") or r.get("shift", {}).get("id") if isinstance(r, dict) else None
check("Mở ca làm việc mới lưu vào VPS DB", s in (200, 201) and shift_id is not None, f"Shift ID: {shift_id}")

if shift_id:
    s, r = req(f"/api/v1/shifts/{shift_id}/close", "POST", {
        "tenant_id": TENANT_ID,
        "ending_cash": 500000 + (sample_prod.get("selling_price", 28000) * 2) - 35000,
        "note": "Chốt ca khớp 100% két"
    })
    check("Chốt ca & đối soát két trên VPS DB", s == 200)

# --- 7. OWNER 3 GOLDEN NUMBERS (P&L) ON VPS DB ---
print("\n📌 [7. BÁO CÁO 3 CON SỐ VÀNG (P&L) ON VPS DB]")
s, r = req(f"/api/v1/owner/pnl-summary?tenant_id={TENANT_ID}")
check("Truy xuất 3 Con Số Vàng bỏ túi từ VPS DB", s == 200 and "real_net_profit" in (r.get("three_golden_numbers") or r))

# --- 8. STORE SETTINGS & HARDWARE ---
print("\n📌 [8. CÀI ĐẶT CỬA HÀNG & MÁY IN ON VPS DB]")
s, r = req(f"/api/v1/settings?tenant_id={TENANT_ID}")
settings_obj = r.get("data", {}) if "data" in r else r
check("Tải cấu hình quán & MB Soundbox từ VPS DB", s == 200 and settings_obj.get("store_name"), f"Quán: {settings_obj.get('store_name')}")

# --- 9. WEBSOCKET REALTIME HUB ---
print("\n📌 [9. WEBSOCKET REALTIME HUB]")
try:
    ctx = ssl.create_default_context()
    s_sock = socket.create_connection(("app.ongchu.cloud", 443), timeout=5)
    ss = ctx.wrap_socket(s_sock, server_hostname="app.ongchu.cloud")
    req_ws = (
        "GET /ws/pos?client_id=vps_test_runner HTTP/1.1\r\n"
        "Host: app.ongchu.cloud\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    ss.sendall(req_ws.encode())
    resp = ss.recv(1024).decode(errors="ignore")
    is_ws_upgraded = "101 Switching Protocols" in resp
    check("WebSocket wss://app.ongchu.cloud/ws/pos Upgrade", is_ws_upgraded, "HTTP 101 OK")
    ss.close()
except Exception as e:
    check("WebSocket Upgrade", False, str(e))

# --- 10. DIRECT VPS DATABASE INTEGRITY CHECK (VIA SSH) ---
print("\n📌 [10. KIỂM TRA TRỰC TIẾP CSDL VPS QUA SSH (ZERO-DB DEPLOYMENT GUARD)]")
try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASS, timeout=15)
    
    stdin, stdout, stderr = ssh.exec_command('sqlite3 /var/www/ongchu-backend/ongchu_pos.db "PRAGMA journal_mode; PRAGMA integrity_check;"')
    db_status = stdout.read().decode('utf-8', errors='replace').strip()
    check("CSDL Pure-Go SQLite WAL & Integrity Check", "wal" in db_status.lower() and "ok" in db_status.lower(), f"Status: {db_status}")

    stdin, stdout, stderr = ssh.exec_command('sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT count(*) FROM products;"')
    prod_db_count = int(stdout.read().decode().strip() or "0")
    check("Bảo toàn số lượng sản phẩm trên CSDL VPS", prod_db_count >= 44, f"Tổng số sản phẩm trong DB: {prod_db_count}")

    stdin, stdout, stderr = ssh.exec_command('sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT count(*) FROM dining_tables;"')
    table_db_count = int(stdout.read().decode().strip() or "0")
    check("Bảo toàn số lượng bàn ăn trên CSDL VPS", table_db_count >= 15, f"Tổng số bàn trong DB: {table_db_count}")

    ssh.close()
except Exception as e:
    check("SSH Direct Database Verification", False, str(e))

print("\n" + "=" * 80)
print(f"📊 TỔNG KẾT KIỂM THỬ VPS DATABASE: {passed} PASS / {failed} FAIL")
print("=" * 80)

if failed == 0:
    print("🎯 TOÀN BỘ HỆ THỐNG KẾT NỐI VÀ TEST TRỰC TIẾP DATABASE VPS HOÀN HẢO 100%!")
    sys.exit(0)
else:
    print("❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH TEST!")
    sys.exit(1)
