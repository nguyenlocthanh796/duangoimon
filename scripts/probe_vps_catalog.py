import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

base_url = "http://116.118.3.48:8080/api/v1"
headers = {
    "X-Tenant-ID": "tenant_quanchebuoiangiang",
    "Content-Type": "application/json"
}

endpoints = [
    "/categories",
    "/products",
    "/tables",
    "/areas",
    "/settings"
]

for ep in endpoints:
    req = urllib.request.Request(base_url + ep, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if isinstance(data, list):
                print(f"Endpoint {ep}: List with {len(data)} items")
                if len(data) > 0:
                    sample = data[0]
                    print(f"  Sample: {sample.get('id')} - {sample.get('name')}")
            elif isinstance(data, dict):
                inner_data = data.get('data')
                if isinstance(inner_data, list):
                    print(f"Endpoint {ep}: Dict with {len(inner_data)} items (key 'data')")
                    if len(inner_data) > 0:
                        sample = inner_data[0]
                        print(f"  Sample: {sample.get('id')} - {sample.get('name')}")
                elif isinstance(inner_data, dict):
                    print(f"Endpoint {ep}: Settings store_name: {inner_data.get('store_name')}")
                else:
                    print(f"Endpoint {ep}: {data}")
    except Exception as e:
        print(f"Endpoint {ep} ERROR: {e}")
