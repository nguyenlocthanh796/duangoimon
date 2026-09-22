import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\locthanhit\Downloads\mau\ongchu_backup_quanchebuoi_2026-09-19.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print("=== Items with sizes in backup JSON ===")
for p in d.get('menuItems', []):
    if p.get('sizes') and len(p.get('sizes')) > 0:
        print(f"  {p.get('id')} - {p.get('name')}: {p.get('sizes')}")

print("\n=== Items with toppings in backup JSON ===")
for p in d.get('menuItems', []):
    if p.get('toppings') and len(p.get('toppings')) > 0:
        print(f"  {p.get('id')} - {p.get('name')}: {p.get('toppings')}")
