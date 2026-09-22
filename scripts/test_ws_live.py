import sys
import json
import time
import websocket

sys.stdout.reconfigure(encoding='utf-8')

print("1. Kết nối Client A...")
ws_a = websocket.create_connection("wss://ongchu.cloud/ws/pos?client_id=client_A&tenant_id=tenant_ongchu")
print("✓ Client A đã kết nối wss://ongchu.cloud/ws/pos thành công!")

print("2. Kết nối Client B...")
ws_b = websocket.create_connection("wss://ongchu.cloud/ws/pos?client_id=client_B&tenant_id=tenant_ongchu")
print("✓ Client B đã kết nối wss://ongchu.cloud/ws/pos thành công!")

print("3. Client A gửi giỏ hàng bàn 01...")
test_cart_msg = {
    "type": "table_cart_updated",
    "table_id": "table_01",
    "cart": [
        {
            "cartItemId": "item_123",
            "name": "Trà Sữa Oolong Lài",
            "qty": 2,
            "unitPrice": 35000
        }
    ],
    "guest_count": 4
}
ws_a.send(json.dumps(test_cart_msg))

print("4. Client B chờ nhận tin nhắn từ Client A...")
ws_b.settimeout(3.0)
try:
    received = ws_b.recv()
    print("🎉 Client B NHẬN ĐƯỢC DỮ LIỆU ĐỒNG BỘ THÀNH CÔNG:")
    print(received)
except Exception as e:
    print("❌ Lỗi không nhận được:", e)

ws_a.close()
ws_b.close()
print("✓ Hoàn tất kiểm thử WebSocket 2 chiều live!")
