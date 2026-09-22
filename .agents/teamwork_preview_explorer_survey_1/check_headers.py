import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r"d:\duanpos-ongchu\frontend"

header_usages = []

for root, _, files in os.walk(os.path.join(ROOT, "app")):
    for f in files:
        if not f.endswith(".tsx"):
            continue
        filepath = os.path.join(root, f)
        rel = os.path.relpath(filepath, ROOT)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
            content = fp.read()

        for m in re.finditer(r'<AppHeader\b([^>]*?)(?:/>|>)', content, re.DOTALL):
            tag_content = m.group(0)
            line_no = content[:m.start()].count('\n') + 1
            
            # extract title prop
            title_m = re.search(r'title=(?:["\']([^"\']+)["\']|\{([^}]+)\})', tag_content)
            title = title_m.group(1) or title_m.group(2) if title_m else 'NONE'

            header_usages.append({
                'file': rel,
                'line': line_no,
                'title': title,
                'tag': tag_content.splitlines()[0][:70]
            })

print(f"Total AppHeader usages across app: {len(header_usages)}")
for x in header_usages:
    print(f"  {x['file']}:{x['line']} | title: {x['title']}")
