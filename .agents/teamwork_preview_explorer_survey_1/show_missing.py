import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\real_jsx_inputs.json", "r", encoding="utf-8") as f:
    inputs = json.load(f)

missing = [x for x in inputs if x['effective_fs'] is None]
for x in missing:
    print(f"{x['file']}:{x['line']} | style: {x['style_prop']} | placeholder: {x['placeholder']}")
