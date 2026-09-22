import json
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\real_jsx_inputs.json", "r", encoding="utf-8") as f:
    inputs = json.load(f)

under_16 = [x for x in inputs if x['effective_fs'] is not None and x['effective_fs'] < 16]

print("Breakdown of font sizes under 16px:")
c = Counter(x['effective_fs'] for x in under_16)
for fs, count in sorted(c.items()):
    print(f"  {fs}px: {count}")

print("\nGrouped by file:")
by_file = {}
for x in under_16:
    by_file.setdefault(x['file'], []).append(x)

for f, items in sorted(by_file.items(), key=lambda t: -len(t[1])):
    print(f"\n📄 {f} ({len(items)} inputs):")
    for it in items:
        ph = (it['placeholder'] or '').replace('\n', ' ')[:35]
        print(f"   L{it['line']:4d} | {it['effective_fs']}px | ph: \"{ph}\"")
