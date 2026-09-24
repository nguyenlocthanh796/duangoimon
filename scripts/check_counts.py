import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('116.118.3.48', port=22, username='root', password='Danh26062002')

queries = [
    ("products", "SELECT count(*) FROM products;"),
    ("orders", "SELECT count(*) FROM orders;"),
    ("ingredients", "SELECT count(*) FROM ingredients;"),
    ("cash_shifts", "SELECT count(*) FROM cash_shifts;"),
    ("cash_transactions", "SELECT count(*) FROM cash_transactions;"),
    ("categories", "SELECT count(*) FROM categories;")
]

print("=== VPS REAL DATABASE COUNTS ===")
for name, q in queries:
    cmd = f'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "{q}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    res = stdout.read().decode('utf-8', errors='ignore').strip()
    print(f"Table '{name}': {res} rows")

ssh.close()
