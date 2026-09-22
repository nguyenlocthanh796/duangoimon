import json
import os
import re

ROOT = r"d:\duanpos-ongchu\frontend"

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\scan_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

apptext = data['apptext']
textinput = data['textinput']

# 1. Investigate MISSING_DEFAULT and M3 variants in AppText
print("=== APPTEXT NON-STANDARD / MISSING VARIANTS ===")
non_standard = [x for x in apptext if x['variant'] in ('MISSING_DEFAULT', 'labelLarge', 'labelSmall', 'textVariant', 'titleMedium')]
for x in non_standard:
    print(f"File: {x['file']}:{x['line']} -> variant='{x['variant']}' | snip: {x['tag_snip']}")

# 2. Check if StyleSheet rules applied to AppText contain fontSize or lineHeight
print("\n=== CHECKING STYLESHEET RULES PASSED TO APPTEXT ===")
stylesheet_font_overrides = []

for root, _, files in os.walk(ROOT):
    for file in files:
        if not (file.endswith('.tsx') or file.endswith('.ts')):
            continue
        filepath = os.path.join(root, file)
        rel_path = os.path.relpath(filepath, ROOT)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # parse styles with fontSize
        blocks = re.findall(r'(\w+):\s*\{([^}]+)\}', content)
        font_styles = {}
        for name, body in blocks:
            fs_match = re.search(r'fontSize:\s*([0-9.]+)', body)
            lh_match = re.search(r'lineHeight:\s*([0-9.]+)', body)
            if fs_match or lh_match:
                font_styles[name] = {
                    'fs': fs_match.group(1) if fs_match else None,
                    'lh': lh_match.group(1) if lh_match else None
                }

        if not font_styles:
            continue

        # Find AppText tags in this file and check their style prop
        for m in re.finditer(r'<AppText\b([^>]*?)(?:/>|>)', content, re.DOTALL):
            tag_content = m.group(0)
            line_no = content[:m.start()].count('\n') + 1
            style_match = re.search(r'style=\{([^}]+)\}', tag_content)
            if style_match:
                s_val = style_match.group(1)
                for s_name in re.findall(r'(?:s|styles|style)\.(\w+)', s_val):
                    if s_name in font_styles:
                        stylesheet_font_overrides.append({
                            'file': rel_path,
                            'line': line_no,
                            'style_name': s_name,
                            'fs': font_styles[s_name]['fs'],
                            'lh': font_styles[s_name]['lh'],
                            'snip': tag_content.splitlines()[0][:80]
                        })

print(f"Total AppText referencing StyleSheet rules with fontSize/lineHeight: {len(stylesheet_font_overrides)}")
for x in stylesheet_font_overrides[:15]:
    print(f"  {x['file']}:{x['line']} (style: {x['style_name']}, fs={x['fs']}, lh={x['lh']}) - {x['snip']}")

# 3. Analyze POS screens typography:
print("\n=== POS CONTENT TYPOGRAPHY BREAKDOWN PER KEY MODULE ===")
pos_modules = [
    'app\\index.tsx',
    'lib\\components\\pos\\product-card',
    'lib\\components\\pos\\table-card',
    'lib\\components\\pos\\FullScreenCartModal.tsx',
    'lib\\components\\pos\\MobileCartBar.tsx',
    'lib\\components\\pos\\ReceiptPreviewModal.tsx',
    'app\\so-quy\\index.tsx',
    'app\\giao-ca\\index.tsx',
    'app\\hoa-don\\index.tsx',
    'app\\thanh-toan\\index.tsx',
    'app\\thuc-don\\index.tsx',
    'app\\kds\\index.tsx',
    'app\\bao-cao-loi-nhuan\\index.tsx',
    'app\\cai-dat\\index.tsx',
    'lib\\components\\ui\\AppHeader.tsx',
    'lib\\components\\ui\\AppRailNav.tsx',
    'lib\\components\\ui\\BottomNavBar.tsx',
    'lib\\components\\ui\\AppSidebar.tsx'
]

for mod in pos_modules:
    items = [x for x in apptext if mod in x['file']]
    c = {}
    for item in items:
        c[item['variant']] = c.get(item['variant'], 0) + 1
    print(f"\nModule: {mod} (total AppText: {len(items)})")
    for v, cnt in sorted(c.items(), key=lambda x: -x[1]):
        print(f"  {v:15}: {cnt}")
