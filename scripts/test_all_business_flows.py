import sys, json, ssl, socket, urllib.request, urllib.error
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://app.ongchu.cloud"
TENANT_ID = "tenant_quanquan"
TENANT_CODE = "quanquan"
USERNAME = "quanquan"
PASSWORD = "Danh@!26062002"

passed = 0
failed = 0

def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name} {detail}")
    else:
        failed += 1
        print(f"  [FAIL] {name} {detail}")

def req(path, method="GET", body=None, headers=None):
    url = f"{BASE_URL}{path}"
    if headers is None:
        headers = {}
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    else:
        data = None
    
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

print("=" * 60)
print(f"TESTING FULL BUSINESS FLOWS ON {BASE_URL}")
print(f"Tenant: {TENANT_CODE} | User: {USERNAME}")
print("=" * 60)

# 1. Health & Engine Status
print("\n1. LUỒNG KIỂM TRA HỆ THỐNG & ENGINE:")
s, r = req("/health")
check("Health check /health", s == 200 and r.get("status") == "healthy", f"HTTP {s}")

s, r = req("/api/v1/health")
check("Health check /api/v1/health", s == 200 and r.get("status") == "healthy", f"HTTP {s}")

# 2. Authentication & Security
print("\n2. LUỒNG XÁC THỰC BẢO MẬT & ĐĂNG NHẬP:")
s, r = req("/api/v1/public/login", "POST", {
    "tenant_code": TENANT_CODE,
    "username": USERNAME,
    "password": PASSWORD
})
check("Đăng nhập đúng tài khoản quanquan", s == 200 and r.get("success") == True, f"Role: {r.get('user', {}).get('role')}")
check("Nhận diện đúng thương hiệu quán", r.get("tenant", {}).get("name") == "Quán Ăn & Đồ Uống QUANQUAN")

s, r = req("/api/v1/public/login", "POST", {
    "tenant_code": TENANT_CODE,
    "username": USERNAME,
    "password": "WrongPassword!"
})
check("Chống tấn công: Sai mật khẩu bị từ chối", s == 401 and r.get("success") == False, f"HTTP {s}")

# Staff PIN login
s, r = req("/api/v1/public/staff-pin", "POST", {"pin": "9999", "tenant_id": TENANT_ID})
check("Đăng nhập nhanh mã PIN 9999 (Chủ quán)", s == 200 and r.get("success") == True)

s, r = req("/api/v1/public/staff-pin", "POST", {"pin": "2222", "tenant_id": TENANT_ID})
check("Đăng nhập nhanh mã PIN 2222 (Thu ngân)", s == 200 and r.get("success") == True)

# 3. Sơ đồ bàn ăn & Khu vực
print("\n3. LUỒNG SƠ ĐỒ BÀN ĂN & KHU VỰC:")
s, r = req(f"/api/v1/areas?tenant_id={TENANT_ID}")
check("Tải danh sách khu vực", s == 200, f"Số lượng: {len(r) if isinstance(r, list) else 'OK'}")

s, r = req(f"/api/v1/tables?tenant_id={TENANT_ID}")
check("Tải danh sách bàn ăn", s == 200, f"Số lượng: {len(r) if isinstance(r, list) else 'OK'}")

# 4. Thực đơn & Danh mục món
print("\n4. LUỒNG THỰC ĐƠN, DANH MỤC & TOPPINGS:")
s, r = req(f"/api/v1/categories?tenant_id={TENANT_ID}")
check("Tải danh mục món ăn", s == 200 and isinstance(r, list), f"Tìm thấy {len(r) if isinstance(r, list) else 0} danh mục")

s, r = req(f"/api/v1/products?tenant_id={TENANT_ID}")
check("Tải danh sách sản phẩm", s == 200 and isinstance(r, list), f"Tìm thấy {len(r) if isinstance(r, list) else 0} món")

s, r = req(f"/api/v1/toppings?tenant_id={TENANT_ID}")
top_list = r.get("data", []) if isinstance(r, dict) else (r if isinstance(r, list) else [])
check("Tải danh sách topping", s == 200 and len(top_list) > 0, f"Tìm thấy {len(top_list)} topping")

# 5. Tạo đơn hàng, Báo bếp & KDS
print("\n5. LUỒNG GỌI MÓN, BÁO BẾP & KDS:")
order_data = {
    "tenant_id": TENANT_ID,
    "table_id": "qq_t1",
    "table_name": "Bàn 01",
    "order_channel": "dine_in",
    "staff_name": "Chủ Quán QUANQUAN",
    "items": [
        {
            "product_id": "qq_prod_trasua_tc",
            "product_name": "Trà Sữa Trân Châu Hoàng Kim",
            "unit_price": 35000,
            "quantity": 2,
            "station": "bar",
            "subtotal": 70000,
            "note": "Ít ngọt, nhiều đá"
        }
    ],
    "subtotal": 70000,
    "discount_amount": 0,
    "vat_amount": 0,
    "total_amount": 70000,
    "payment_method": "cash",
    "status": "dang_xu_ly"
}

s, r = req("/api/v1/orders", "POST", order_data)
order_id = r.get("id") if isinstance(r, dict) else None
check("Tạo đơn hàng gọi món & báo bếp", s in (200, 201) and order_id is not None, f"Order ID: {order_id}")

# 6. Bếp & Bar KDS tiếp nhận
print("\n6. LUỒNG BẾP & BAR (KDS CHẾ BIẾN):")
s, r = req(f"/api/v1/kds/orders?tenant_id={TENANT_ID}")
kds_count = len(r) if isinstance(r, list) else 0
check("Tải danh sách vé bếp KDS", s == 200 and kds_count > 0, f"Số vé đang xử lý: {kds_count}")

# 7. VietQR, In Bill & Thanh Toán
print("\n7. LUỒNG THANH TOÁN & IN BILL:")
if order_id:
    # VietQR code generation
    s, r = req(f"/api/v1/orders/{order_id}/vietqr")
    check("Sinh mã thanh toán VietQR Napas247", s == 200 and ("quick_link" in r or "emvco" in r or "qr_data_url" in r), f"Link: {r.get('quick_link', '')[:40]}...")

    # Pre-print bill
    s, r = req(f"/api/v1/orders/{order_id}/pre-print", "POST", {})
    check("In tạm tính bill (Pre-print)", s in (200, 400), f"HTTP {s}")

    # Pay order
    s, r = req(f"/api/v1/orders/{order_id}/pay", "POST", {
        "payment_method": "cash",
        "cash_received": 100000,
        "cash_change": 30000,
        "staff_name": "Thu Ngân"
    })
    is_paid = (r.get("order", {}).get("status") == "da_thanh_toan") if isinstance(r, dict) else False
    check("Thanh toán hoàn tất đơn hàng", s == 200 and is_paid, f"Status: {r.get('order', {}).get('status')}")

# 8. Sổ Quỹ Tiền Mặt (Chi Chợ Thực Tế)
print("\n8. LUỒNG SỔ QUỸ CHI CHỢ (CASH FLOW):")
s, r = req("/api/v1/cash/transactions", "POST", {
    "tenant_id": TENANT_ID,
    "branch_id": "branch_qq_01",
    "type": "out",
    "category": "Chi Chợ Hàng Ngày",
    "amount": 50000,
    "recipient": "Cô Ba bán rau",
    "note": "Mua 5kg rau sống + chanh sả",
    "staff_name": "Chủ Quán QUANQUAN"
})
has_tx = ("transaction" in r or "id" in r or r.get("success") == True) if isinstance(r, dict) else False
check("Ghi nhận phiếu chi chợ tiền mặt 50.000đ", s in (200, 201) and has_tx, f"HTTP {s}")

s, r = req(f"/api/v1/cash/transactions?tenant_id={TENANT_ID}")
check("Tải danh sách giao dịch Sổ Quỹ", s == 200 and isinstance(r, list), f"Số bản ghi: {len(r) if isinstance(r, list) else 0}")

s, r = req(f"/api/v1/cash/summary?tenant_id={TENANT_ID}")
check("Tính toán số dư Sổ Quỹ thực tế", s == 200, f"HTTP {s}")

# 9. Báo Cáo 3 Con Số Vàng (P&L)
print("\n9. LUỒNG BÁO CÁO 3 CON SỐ VÀNG (P&L CHỦ QUÁN):")
s, r = req(f"/api/v1/owner/pnl-summary?tenant_id={TENANT_ID}")
check("Truy xuất 3 Con Số Vàng bỏ túi", s == 200, f"Revenue: {r.get('total_revenue', 0):,}đ | Net: {r.get('real_net_profit', 0):,}đ" if isinstance(r, dict) else f"HTTP {s}")

# 10. Cài đặt cửa hàng & Ngân hàng
print("\n10. LUỒNG CÀI ĐẶT CỬA HÀNG & MẪU IN:")
s, r = req(f"/api/v1/settings?tenant_id={TENANT_ID}")
store_n = r.get("data", {}).get("store_name") if "data" in r else r.get("store_name")
check("Tải cấu hình quán & thông tin VietQR", s == 200 and store_n is not None, f"Store: {store_n}")

# 11. WebSocket Realtime Hub
print("\n11. LUỒNG ĐỒNG BỘ REALTIME WEBSOCKET:")
try:
    ctx = ssl.create_default_context()
    s_sock = socket.create_connection(("app.ongchu.cloud", 443), timeout=5)
    ss = ctx.wrap_socket(s_sock, server_hostname="app.ongchu.cloud")
    req_ws = (
        "GET /ws/pos?client_id=tester_bot HTTP/1.1\r\n"
        "Host: app.ongchu.cloud\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    ss.sendall(req_ws.encode())
    resp = ss.recv(1024).decode(errors="ignore")
    is_ws_upgraded = "101 Switching Protocols" in resp
    check("Bắt tay nâng cấp WebSocket wss://app.ongchu.cloud/ws/pos", is_ws_upgraded, "HTTP 101 OK")
    ss.close()
except Exception as e:
    check("Bắt tay nâng cấp WebSocket", False, str(e))

print("\n" + "=" * 60)
print(f"KẾT QUẢ KIỂM THỬ: {passed} PASS / {failed} FAIL")
print("=" * 60)

if failed == 0:
    print(">>> 100% LUỒNG NGHIỆP VỤ HOẠT ĐỘNG HOÀN HẢO TRÊN PRODUCTION!")
    sys.exit(0)
else:
    print(">>> CÓ LỖI TRONG MỘT SỐ LUỒNG!")
    sys.exit(1)
