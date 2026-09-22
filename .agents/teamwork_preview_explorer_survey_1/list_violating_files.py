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

for idx, (fname, items) in enumerate(sorted(by_file.items()), 1):
    print(f"{idx:2d}. {fname:55s} : {len(items)} violating inputs")
