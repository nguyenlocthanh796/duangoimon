import json

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\precise_inputs.json", "r", encoding="utf-8") as f:
    inputs = json.load(f)

# Keep ONLY app and lib
src_inputs = [x for x in inputs if x['file'].startswith('app\\') or x['file'].startswith('lib\\') or x['file'].startswith('app/') or x['file'].startswith('lib/')]

under_16 = [x for x in src_inputs if x['effective_fs'] is not None and x['effective_fs'] < 16]
missing = [x for x in src_inputs if x['effective_fs'] is None]
gte_16 = [x for x in src_inputs if x['effective_fs'] is not None and x['effective_fs'] >= 16]

print(f"Total TextInput in app & lib: {len(src_inputs)}")
print(f"  fontSize >= 16: {len(gte_16)}")
print(f"  fontSize < 16 : {len(under_16)}")
print(f"  missing fs    : {len(missing)}")
print(f"Total violating : {len(under_16) + len(missing)}")

print("\nMissing fontSize items in app & lib:")
for x in missing:
    print(f"  {x['file']}:{x['line']} -> {x['tag_preview'][:60]}")
