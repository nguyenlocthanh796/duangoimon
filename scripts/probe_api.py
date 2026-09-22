import urllib.request
import urllib.error
import ssl
import json

ctx = ssl.create_default_context()

endpoints = [
    ("GET", "/health"),
    ("GET", "/api/v1/health"),
    ("GET", "/api/v1/settings"),
    ("GET", "/api/v1/products"),
    ("GET", "/api/v1/tables"),
    ("GET", "/api/v1/categories"),
    ("GET", "/api/v1/areas"),
    ("GET", "/api/v1/toppings"),
    ("GET", "/api/v1/staff"),
    ("GET", "/api/v1/expenses/recurring"),
    ("GET", "/api/v1/shifts/current"),
    ("GET", "/api/v1/saas/overview"),
    ("GET", "/api/v1/saas/tenants"),
    ("GET", "/api/v1/owner/pnl-summary"),
]

print("=== PROBING BACKEND ON app.ongchu.cloud ===")
for method, path in endpoints:
    url = f"https://app.ongchu.cloud{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = resp.read()
            print(f"[{resp.status}] {method} {path} -> {len(data)} bytes")
            if len(data) < 300:
                print(f"    Body: {data.decode('utf-8', errors='replace')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:200]
        print(f"[{e.code}] {method} {path} -> {e.reason} | {body}")
    except Exception as e:
        print(f"[ERR] {method} {path} -> {e}")
