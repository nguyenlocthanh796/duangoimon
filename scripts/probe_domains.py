import urllib.request
import urllib.error
import ssl

ctx = ssl.create_default_context()

domains = [
    "https://ongchu.cloud",
    "https://www.ongchu.cloud",
    "https://app.ongchu.cloud",
    "https://app.ongchu.cloud/health",
    "https://app.ongchu.cloud/api/v1/health",
    "https://app.ongchu.cloud/api/v1/store/settings",
    "https://app.ongchu.cloud/login",
    "https://app.ongchu.cloud/thuc-don",
    "https://app.ongchu.cloud/cai-dat"
]

for url in domains:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            content = resp.read()
            print(f"[{resp.status}] {url} -> Content-Type: {resp.headers.get('Content-Type', '')} Length: {len(content)}")
    except urllib.error.HTTPError as e:
        print(f"[{e.code}] {url} -> HTTP Error: {e.reason}")
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
