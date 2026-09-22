import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\violating_textinputs.json", "r", encoding="utf-8") as f:
    records = json.load(f)

by_file = {}
for r in records:
    f = r['file']
    if f not in by_file:
        by_file[f] = []
    by_file[f].append(r)

print(f"Total files with violating TextInputs: {len(by_file)}")
for fname, items in sorted(by_file.items()):
    print(f"\nFile: {fname} ({len(items)} inputs):")
    for it in items:
        cur = f"{it['current_fs']}px" if it['current_fs'] else "MISSING (no fontSize set)"
        print(f"   Line {it['line']:4d} | Current: {cur:25s} | Style: {it['style_prop']}")
