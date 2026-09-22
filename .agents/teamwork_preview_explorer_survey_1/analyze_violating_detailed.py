import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\precise_inputs.json", "r", encoding="utf-8") as f:
    inputs = json.load(f)

under_16 = [x for x in inputs if x['effective_fs'] is not None and x['effective_fs'] < 16]
missing = [x for x in inputs if x['effective_fs'] is None]

print(f"=== BREAKDOWN OF FONTSIZE < 16 ({len(under_16)} items) ===")
by_file_u16 = {}
for x in under_16:
    f = x['file']
    by_file_u16.setdefault(f, []).append(x)

for f, items in sorted(by_file_u16.items()):
    print(f"\n📁 {f} ({len(items)} inputs):")
    for it in items:
        print(f"   Line {it['line']:4d} | fs: {it['effective_fs']} | tag: {it['tag_preview'][:60]}")
        if it['style_prop']:
            print(f"          style: {it['style_prop'][:80]}")

print(f"\n=== BREAKDOWN OF MISSING FONTSIZE ({len(missing)} items) ===")
by_file_missing = {}
for x in missing:
    f = x['file']
    by_file_missing.setdefault(f, []).append(x)

for f, items in sorted(by_file_missing.items()):
    print(f"\n📁 {f} ({len(items)} inputs):")
    for it in items:
        print(f"   Line {it['line']:4d} | tag: {it['tag_preview'][:60]}")
        if it['style_prop']:
            print(f"          style: {it['style_prop'][:80]}")
        else:
            print(f"          style: NONE")
