import os
import re
import sys
import json

ROOT = r"d:\duanpos-ongchu\frontend"

textinput_results = []
raw_text_results = []
apptext_results = []

def parse_stylesheet_fonts(content):
    """Find styles defined in StyleSheet.create or style objects with fontSize."""
    styles = {}
    # Pattern to find style properties: foo: { ... fontSize: 14 ... }
    # Simple block parser
    blocks = re.findall(r'(\w+):\s*\{([^}]+)\}', content)
    for name, body in blocks:
        fs_match = re.search(r'fontSize:\s*([0-9.]+)', body)
        lh_match = re.search(r'lineHeight:\s*([0-9.]+)', body)
        if fs_match:
            styles[name] = {
                'fontSize': float(fs_match.group(1)),
                'lineHeight': float(lh_match.group(1)) if lh_match else None
            }
        else:
            styles[name] = {'fontSize': None, 'lineHeight': None}
    return styles

def scan_file(filepath):
    rel_path = os.path.relpath(filepath, ROOT)
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        lines = content.splitlines()

    styles = parse_stylesheet_fonts(content)

    # 1. Raw <Text> usage (exclude AppText.tsx)
    if not filepath.endswith("AppText.tsx"):
        # Check if Text is imported from 'react-native'
        rn_import_match = re.search(r'import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*[\'"]react-native[\'"]', content)
        if rn_import_match:
            # Find all <Text
            for i, line in enumerate(lines):
                # match <Text followed by whitespace, >, or /
                for m in re.finditer(r'<Text(\s|>|/)', line):
                    # verify it is not </Text or <AppText or <TextInput
                    col = m.start()
                    prefix = line[:col]
                    if not prefix.endswith('App') and not prefix.endswith('/'):
                        raw_text_results.append({
                            'file': rel_path,
                            'line': i + 1,
                            'content': line.strip()
                        })

    # 2. TextInput scan
    # Find all <TextInput tags (can span multiple lines)
    # We can use regex with DOTALL to extract full <TextInput ... /> or <TextInput ... >
    for m in re.finditer(r'<TextInput\b([^>]*?)(?:/>|>)', content, re.DOTALL):
        tag_content = m.group(0)
        # find line number
        start_pos = m.start()
        line_num = content[:start_pos].count('\n') + 1
        
        # Check style prop
        style_match = re.search(r'style=\{([^}]+)\}', tag_content)
        style_val = style_match.group(1).strip() if style_match else None
        
        # Check inline fontSize
        inline_fs = None
        fs_match = re.search(r'fontSize:\s*([0-9.]+)', tag_content)
        if fs_match:
            inline_fs = float(fs_match.group(1))

        # Check style references (e.g. s.input, styles.searchInput, etc.)
        ref_fs = None
        if style_val:
            for s_name in re.findall(r'(?:s|styles|style)\.(\w+)', style_val):
                if s_name in styles and styles[s_name]['fontSize'] is not None:
                    ref_fs = styles[s_name]['fontSize']
                    break

        effective_fs = inline_fs if inline_fs is not None else ref_fs

        textinput_results.append({
            'file': rel_path,
            'line': line_num,
            'tag': tag_content.splitlines()[0][:100],
            'style_prop': style_val,
            'inline_fontSize': inline_fs,
            'style_ref_fontSize': ref_fs,
            'effective_fontSize': effective_fs
        })

    # 3. AppText scan
    for m in re.finditer(r'<AppText\b([^>]*?)(?:/>|>)', content, re.DOTALL):
        tag_content = m.group(0)
        start_pos = m.start()
        line_num = content[:start_pos].count('\n') + 1

        # variant
        var_match = re.search(r'variant=["\'{]([a-zA-Z0-9_]+)["\'}]', tag_content)
        variant = var_match.group(1) if var_match else 'MISSING_DEFAULT'

        # inline fontSize or lineHeight in style prop
        style_match = re.search(r'style=\{([^}]+)\}', tag_content)
        has_inline_fs = False
        has_inline_lh = False
        inline_fs_val = None
        inline_lh_val = None
        if style_match:
            s_body = style_match.group(1)
            fs_m = re.search(r'fontSize:\s*([0-9.]+)', s_body)
            lh_m = re.search(r'lineHeight:\s*([0-9.]+)', s_body)
            if fs_m:
                has_inline_fs = True
                inline_fs_val = float(fs_m.group(1))
            if lh_m:
                has_inline_lh = True
                inline_lh_val = float(lh_m.group(1))

        apptext_results.append({
            'file': rel_path,
            'line': line_num,
            'variant': variant,
            'has_inline_fs': has_inline_fs,
            'inline_fs_val': inline_fs_val,
            'has_inline_lh': has_inline_lh,
            'inline_lh_val': inline_lh_val,
            'tag_snip': tag_content.splitlines()[0][:80]
        })

def main():
    dirs_to_scan = [
        os.path.join(ROOT, "app"),
        os.path.join(ROOT, "lib")
    ]

    for d in dirs_to_scan:
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith(".tsx") or file.endswith(".ts"):
                    scan_file(os.path.join(root, file))

    out_file = r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\scan_summary.json"
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({
            'textinput': textinput_results,
            'raw_text': raw_text_results,
            'apptext': apptext_results
        }, f, indent=2)

    print(f"Scanned complete:")
    print(f"Total TextInput: {len(textinput_results)}")
    textinput_under_16 = [t for t in textinput_results if t['effective_fontSize'] is not None and t['effective_fontSize'] < 16]
    textinput_missing_fs = [t for t in textinput_results if t['effective_fontSize'] is None]
    print(f"TextInput with fontSize < 16: {len(textinput_under_16)}")
    print(f"TextInput with missing fontSize: {len(textinput_missing_fs)}")
    print(f"Total raw <Text>: {len(raw_text_results)}")
    print(f"Total AppText: {len(apptext_results)}")

if __name__ == "__main__":
    main()
