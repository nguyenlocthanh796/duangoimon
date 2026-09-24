import requests, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VPS = 'https://app.ongchu.cloud'
headers = {
    'X-Tenant-ID': 'tenant_87fb90f7',
    'Authorization': 'Bearer jwt_token_usr_e49db06a'
}
res = requests.get(VPS + '/api/v1/tables?tenant_id=tenant_87fb90f7', headers=headers)
tables = res.json()

print('export const INITIAL_TABLES: TableItem[] = [')
for t in tables:
    tid = t.get('id')
    name = t.get('name')
    area = t.get('area') or t.get('area_name') or 'Trong Nhà'
    cap = t.get('capacity', 4)
    print(f"  {{ id: '{tid}', name: '{name}', area: '{area}', capacity: {cap}, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 }},")
print('];')
