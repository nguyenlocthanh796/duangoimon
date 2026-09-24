import sys, io, json, time
import websocket

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

WS_URL = "wss://app.ongchu.cloud/ws/pos?client_id=audit_test_client&tenant_id=tenant_87fb90f7&branch_id=branch_9d220a0f"

print("================================================================================")
print("👑 ONGCHU LEAN POS - WEBSOCKET REALTIME SYNC AUDIT")
print("================================================================================")
print("Connecting to:", WS_URL)

received_messages = []

def on_message(ws, message):
    print("  [WS RECV]:", message[:150])
    received_messages.append(message)

def on_error(ws, error):
    print("  [WS ERROR]:", error)

def on_close(ws, close_status_code, close_msg):
    print("  [WS CLOSED]:", close_status_code, close_msg)

def on_open(ws):
    print("  ✅ WebSocket kết nối thành công 101 Switching Protocols!")
    
    # Send ping heartbeat
    ping_msg = {
        'type': 'ping',
        'tenant_id': 'tenant_87fb90f7',
        'branch_id': 'branch_9d220a0f',
        'timestamp': int(time.time() * 1000)
    }
    ws.send(json.dumps(ping_msg))
    print("  [WS SENT]: ping heartbeat")
    
    # Broadcast a test sync event
    sync_event = {
        'type': 'table_status_changed',
        'tenant_id': 'tenant_87fb90f7',
        'branch_id': 'branch_9d220a0f',
        'table_id': 'table_01',
        'status': 'available',
        'timestamp': int(time.time() * 1000)
    }
    ws.send(json.dumps(sync_event))
    print("  [WS SENT]: table_status_changed event")
    
    time.sleep(2)
    ws.close()

ws = websocket.WebSocketApp(WS_URL, on_open=on_open, on_message=on_message, on_error=on_error, on_close=on_close)
ws.run_forever()

print(f"\nAudit Result: Nhận {len(received_messages)} tin nhắn phản hồi từ WebSocket Hub.")
