import sys, io, urllib.request, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = 'https://app.ongchu.cloud/api/v1'
TID = 'tenant_87fb90f7'

endpoints = [
    ('1. SƠ ĐỒ BÀN (/tables)', f'{BASE}/tables?tenant_id={TID}'),
    ('2. KHU VỰC BÀN (/areas)', f'{BASE}/areas?tenant_id={TID}'),
    ('3. DANH MỤC MÓN (/categories)', f'{BASE}/categories?tenant_id={TID}'),
    ('4. DANH SÁCH MÓN ĂN (/products)', f'{BASE}/products?tenant_id={TID}'),
    ('5. SỔ QUỸ CHI CHỢ (/cash/transactions)', f'{BASE}/cash/transactions?tenant_id={TID}'),
    ('6. CA LÀM VIỆC (/shifts/current)', f'{BASE}/shifts/current?tenant_id={TID}'),
    ('7. BÁO CÁO 3 CON SỐ VÀNG (/owner/pnl-summary)', f'{BASE}/owner/pnl-summary?tenant_id={TID}'),
]

for title, url in endpoints:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode('utf-8')
            data = json.loads(raw)
            print(f'=== {title} ===')
            if isinstance(data, dict):
                for k, v in data.items():
                    if isinstance(v, list):
                        sample = v[0].get('name', '') if len(v) > 0 and isinstance(v[0], dict) else ''
                        print(f'  • {k}: {len(v)} mục (VD: {sample})')
                    elif isinstance(v, dict):
                        print(f'  • {k}: {json.dumps(v, ensure_ascii=False)}')
                    else:
                        print(f'  • {k}: {v}')
            elif isinstance(data, list):
                sample = data[0].get('name', '') if len(data) > 0 and isinstance(data[0], dict) else ''
                print(f'  • Tổng: {len(data)} mục (VD: {sample})')
    except Exception as e:
        print(f'=== {title} === LỖI: {e}')
