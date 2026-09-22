import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"d:\duanpos-ongchu\frontend\app\so-quy\index.tsx", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.splitlines()

for m in re.finditer(r'<AppText\b([^>]*?)(?:/>|>)', content, re.DOTALL):
    tag = m.group(0)
    line_no = content[:m.start()].count('\n') + 1
    var_m = re.search(r'variant=["\'](\w+)["\']', tag)
    variant = var_m.group(1) if var_m else 'NONE'
    first_line = lines[line_no-1].strip()
    next_line = lines[line_no].strip() if line_no < len(lines) else ''
    print(f"L{line_no:4d} | {variant:6s} | {first_line[:50]} -> {next_line[:40]}")
