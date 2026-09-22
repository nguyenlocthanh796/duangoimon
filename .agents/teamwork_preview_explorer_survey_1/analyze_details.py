import json
from collections import Counter

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\scan_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

apptext = data['apptext']
textinput = data['textinput']
raw_text = data['raw_text']

print("=== APPTEXT VARIANT BREAKDOWN ===")
variants = Counter(x['variant'] for x in apptext)
for v, count in variants.most_common():
    pct = (count / len(apptext)) * 100
    print(f"  {v:20}: {count:5} ({pct:5.2f}%)")

print("\n=== APPTEXT INLINE FONT OVERRIDES ===")
with_inline_fs = [x for x in apptext if x['has_inline_fs']]
with_inline_lh = [x for x in apptext if x['has_inline_lh']]
print(f"  AppText with inline fontSize  : {len(with_inline_fs)}")
print(f"  AppText with inline lineHeight: {len(with_inline_lh)}")

if with_inline_fs:
    print("Sample inline fontSize:")
    for x in with_inline_fs[:10]:
        print(f"    {x['file']}:{x['line']} (fs: {x['inline_fs_val']}) - {x['tag_snip']}")

print("\n=== TEXTINPUT FONT SIZE BREAKDOWN ===")
fs_counter = Counter(str(x['effective_fontSize']) for x in textinput)
for fs, count in fs_counter.most_common():
    print(f"  fontSize = {fs:10}: {count:4}")

under_16 = [x for x in textinput if x['effective_fontSize'] is not None and x['effective_fontSize'] < 16]
missing_fs = [x for x in textinput if x['effective_fontSize'] is None]

print(f"\nTextInput < 16px ({len(under_16)} items):")
by_file_under16 = Counter(x['file'] for x in under_16)
for f, c in by_file_under16.most_common():
    print(f"  {f}: {c}")

print(f"\nTextInput missing fontSize ({len(missing_fs)} items):")
by_file_missing = Counter(x['file'] for x in missing_fs)
for f, c in by_file_missing.most_common():
    print(f"  {f}: {c}")
