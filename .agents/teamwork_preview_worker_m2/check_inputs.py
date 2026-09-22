import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\real_jsx_inputs.json", "r", encoding="utf-8") as f:
    inputs = json.load(f)

under_16 = [x for x in inputs if x['effective_fs'] is not None and x['effective_fs'] < 16]
missing = [x for x in inputs if x['effective_fs'] is None]

print(f"Missing count: {len(missing)}")
for m in missing:
    print(f"  {m['file']}:{m['line']} -> {m['placeholder']}")

print(f"\nUnder 16 count: {len(under_16)}")
by_file = {}
for u in under_16:
    by_file.setdefault(u['file'], []).append(u)

for f, items in by_file.items():
    print(f"  {f}: {len(items)} items")
    for it in items:
        print(f"    Line {it['line']} (current: {it['effective_fs']}): {it['placeholder']}")
