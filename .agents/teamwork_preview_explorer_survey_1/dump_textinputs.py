import json
import os
import re

ROOT = r"d:\duanpos-ongchu\frontend"

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\scan_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

textinputs = data['textinput']

violating = [x for x in textinputs if x['effective_fontSize'] is None or x['effective_fontSize'] < 16]

print(f"Total violating TextInputs: {len(violating)}")

out_records = []

for item in violating:
    filepath = os.path.join(ROOT, item['file'])
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Get lines around the line number
    lines = content.splitlines()
    line_idx = item['line'] - 1
    start_line = max(0, line_idx - 2)
    end_line = min(len(lines), line_idx + 8)
    snippet = "\n".join(f"{i+1}: {lines[i]}" for i in range(start_line, end_line))

    # Find the tag
    rec = {
        'file': item['file'],
        'line': item['line'],
        'current_fs': item['effective_fontSize'],
        'style_prop': item['style_prop'],
        'snippet': snippet
    }
    out_records.append(rec)

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\violating_textinputs.json", "w", encoding="utf-8") as f:
    json.dump(out_records, f, indent=2)

print(f"Saved {len(out_records)} records to violating_textinputs.json")
