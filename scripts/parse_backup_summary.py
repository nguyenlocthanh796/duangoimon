import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\locthanhit\Downloads\mau\ongchu_backup_quanchebuoi_2026-09-19.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print('Tenant:', d.get('tenantId'))
print('Store name:', d.get('storeSettings', {}).get('storeName'))
print('Categories count:', len(d.get('categories', [])))
print('Menu items count:', len(d.get('menuItems', [])))
print('Tables count:', len(d.get('tables', [])))
print('Areas count:', len(d.get('areas', [])))

print("\n--- Categories ---")
for c in d.get('categories', []):
    print(f"  {c.get('id')}: {c.get('name')}")

print("\n--- Areas ---")
for a in d.get('areas', []):
    print(f"  {a.get('id')}: {a.get('name')}")

print("\n--- Tables ---")
for t in d.get('tables', []):
    print(f"  {t.get('id')}: {t.get('name')} | Khu: {t.get('area')} | Sức chứa: {t.get('capacity')}")

print("\n--- Products (First 10) ---")
for p in d.get('menuItems', [])[:10]:
    print(f"  {p.get('id')} | Mã: {p.get('code')} | Tên: {p.get('name')} | Giá: {p.get('price')} | Nhóm: {p.get('category')}")
