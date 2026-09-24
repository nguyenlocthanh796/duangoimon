import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
p = r'C:\Users\locthanhit\.gemini\antigravity\brain\6a49a964-247b-40f6-b243-c054b792c94c\.system_generated\steps\1454\output.txt'
with open(p, 'r', encoding='utf-8') as f:
    s = f.read()

texts = re.findall(r'text="([^"]+)"', s)
print(f"Total text nodes: {len(texts)}")
for t in texts:
    print(f"  * {t}")
