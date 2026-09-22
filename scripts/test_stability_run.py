import os
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""))

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    return out

test_stability_script = """import websocket
import json
import time

print('1. Connecting 2 clients...')
ws_a = websocket.create_connection('wss://ongchu.cloud/ws/pos?client_id=client_A&tenant_id=tenant_ongchu')
ws_b = websocket.create_connection('wss://ongchu.cloud/ws/pos?client_id=client_B&tenant_id=tenant_ongchu')
print('Connected! Testing continuous sync for 6 seconds...')

for i in range(1, 6):
    time.sleep(1.0)
    ws_a.send(json.dumps({'type': 'table_cart_updated', 'table_id': 'table_01', 'cart': [{'name': f'Món test {i}', 'qty': i, 'unitPrice': 10000}]}))
    ws_b.settimeout(2.0)
    msg = ws_b.recv()
    parsed = json.loads(msg)
    print(f'✓ Step {i}: Client B received:', parsed.get('type'), 'item:', parsed.get('cart')[0]['name'])

ws_a.close()
ws_b.close()
print('🎉 ALL STABILITY TESTS PASSED 100%!')
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_stability.py', 'w') as f:
    f.write(test_stability_script)
sftp.close()

print(run("python3 /tmp/test_stability.py"))

client.close()
