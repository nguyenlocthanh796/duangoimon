import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r"d:\duanpos-ongchu\frontend"

def parse_stylesheet_fonts(content):
    styles = {}
    for m in re.finditer(r'(\w+):\s*\{([^}]+)\}', content):
        name = m.group(1)
        body = m.group(2)
        fs_match = re.search(r'fontSize:\s*([0-9.]+)', body)
        styles[name] = float(fs_match.group(1)) if fs_match else None
    return styles

def extract_tag_and_props(content, start_idx):
    i = start_idx
    n = len(content)
    in_quotes = False
    quote_char = None
    brace_depth = 0
    while i < n:
        c = content[i]
        if in_quotes:
            if c == quote_char and content[i-1] != '\\':
                in_quotes = False
        else:
            if c in ('"', "'", '`'):
                in_quotes = True
                quote_char = c
            elif c == '{':
                brace_depth += 1
            elif c == '}':
                brace_depth -= 1
            elif c == '>' and brace_depth == 0:
                return content[start_idx:i+1]
        i += 1
    return content[start_idx:]

def extract_prop(tag_str, prop_name):
    m = re.search(r'\b' + prop_name + r'\s*=\s*', tag_str)
    if not m:
        return None
    start = m.end()
    if start >= len(tag_str):
        return None
    c = tag_str[start]
    if c in ('"', "'", '`'):
        end = tag_str.find(c, start + 1)
        return tag_str[start+1:end] if end != -1 else None
    elif c == '{':
        brace_depth = 0
        in_quotes = False
        quote_char = None
        i = start
        while i < len(tag_str):
            ch = tag_str[i]
            if in_quotes:
                if ch == quote_char and tag_str[i-1] != '\\':
                    in_quotes = False
            else:
                if ch in ('"', "'", '`'):
                    in_quotes = True
                    quote_char = ch
                elif ch == '{':
                    brace_depth += 1
                elif ch == '}':
                    brace_depth -= 1
                    if brace_depth == 0:
                        return tag_str[start+1:i]
            i += 1
        return tag_str[start+1:]
    return None

def scan():
    jsx_inputs = []
    for root_dir in [os.path.join(ROOT, "app"), os.path.join(ROOT, "lib")]:
        for root, _, files in os.walk(root_dir):
            for f in files:
                if not (f.endswith('.tsx') or f.endswith('.ts')):
                    continue
                path = os.path.join(root, f)
                rel = os.path.relpath(path, ROOT)
                with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()

                styles = parse_stylesheet_fonts(content)

                for m in re.finditer(r'<TextInput\s', content):
                    start_pos = m.start()
                    prefix = content[max(0, start_pos-10):start_pos]
                    if 'useRef' in prefix or prefix.endswith(':'):
                        continue

                    line_no = content[:start_pos].count('\n') + 1
                    tag_str = extract_tag_and_props(content, start_pos)
                    style_prop = extract_prop(tag_str, 'style')

                    inline_fs = None
                    ref_fs = None
                    if style_prop:
                        fs_m = re.search(r'fontSize:\s*([0-9.]+)', style_prop)
                        if fs_m:
                            inline_fs = float(fs_m.group(1))
                        for s_ref in re.findall(r'(?:s|styles|style)\.(\w+)', style_prop):
                            if s_ref in styles and styles[s_ref] is not None:
                                ref_fs = styles[s_ref]
                                break

                    effective_fs = inline_fs if inline_fs is not None else ref_fs
                    placeholder = extract_prop(tag_str, 'placeholder')

                    jsx_inputs.append({
                        'file': rel,
                        'line': line_no,
                        'tag_preview': tag_str.splitlines()[0],
                        'style_prop': style_prop.strip() if style_prop else None,
                        'inline_fs': inline_fs,
                        'ref_fs': ref_fs,
                        'effective_fs': effective_fs,
                        'placeholder': placeholder
                    })

    gte_16 = [x for x in jsx_inputs if x['effective_fs'] is not None and x['effective_fs'] >= 16]
    under_16 = [x for x in jsx_inputs if x['effective_fs'] is not None and x['effective_fs'] < 16]
    missing = [x for x in jsx_inputs if x['effective_fs'] is None]

    print(f"Total REAL JSX <TextInput elements: {len(jsx_inputs)}")
    print(f"  fontSize >= 16 : {len(gte_16)}")
    print(f"  fontSize < 16  : {len(under_16)}")
    print(f"  missing fontSize: {len(missing)}")
    if missing:
        print("Missing:")
        for m in missing:
            print(f"  {m['file']}:{m['line']} ({m['placeholder']})")
    return len(missing), len(under_16)

if __name__ == '__main__':
    scan()
