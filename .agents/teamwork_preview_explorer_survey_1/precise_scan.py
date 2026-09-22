import os
import re
import json

ROOT = r"d:\duanpos-ongchu\frontend"

def extract_tag_and_props(content, start_idx):
    """Extract full <TextInput ... /> tag handling balanced braces."""
    i = start_idx
    n = len(content)
    # find where tag ends: '>' not inside quotes or braces
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
    # Find prop_name=
    m = re.search(r'\b' + prop_name + r'\s*=\s*', tag_str)
    if not m:
        return None
    start = m.end()
    if start >= len(tag_str):
        return None
    c = tag_str[start]
    if c in ('"', "'", '`'):
        # string literal
        end = tag_str.find(c, start + 1)
        return tag_str[start+1:end] if end != -1 else None
    elif c == '{':
        # expression
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

def parse_stylesheet_fonts(content):
    # Match StyleSheet.create({ ... })
    styles = {}
    # Simple block parser for each style definition
    for m in re.finditer(r'(\w+):\s*\{([^}]+)\}', content):
        name = m.group(1)
        body = m.group(2)
        fs_match = re.search(r'fontSize:\s*([0-9.]+)', body)
        styles[name] = float(fs_match.group(1)) if fs_match else None
    return styles

all_inputs = []

for root, _, files in os.walk(ROOT):
    for f in files:
        if not (f.endswith('.tsx') or f.endswith('.ts')):
            continue
        path = os.path.join(root, f)
        rel = os.path.relpath(path, ROOT)
        with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
            content = fp.read()

        styles = parse_stylesheet_fonts(content)

        # find all <TextInput
        for m in re.finditer(r'<TextInput\b', content):
            start_pos = m.start()
            line_no = content[:start_pos].count('\n') + 1
            tag_str = extract_tag_and_props(content, start_pos)
            style_prop = extract_prop(tag_str, 'style')

            # Now find fontSize inside style_prop
            inline_fs = None
            ref_fs = None
            if style_prop:
                # check direct inline fontSize: 16
                fs_m = re.search(r'fontSize:\s*([0-9.]+)', style_prop)
                if fs_m:
                    inline_fs = float(fs_m.group(1))
                # check style references
                for s_ref in re.findall(r'(?:s|styles|style)\.(\w+)', style_prop):
                    if s_ref in styles and styles[s_ref] is not None:
                        ref_fs = styles[s_ref]
                        break

            effective_fs = inline_fs if inline_fs is not None else ref_fs

            all_inputs.append({
                'file': rel,
                'line': line_no,
                'tag_preview': tag_str.splitlines()[0],
                'style_prop': style_prop.strip() if style_prop else None,
                'inline_fs': inline_fs,
                'ref_fs': ref_fs,
                'effective_fs': effective_fs
            })

with open(r"d:\duanpos-ongchu\.agents\teamwork_preview_explorer_survey_1\precise_inputs.json", 'w', encoding='utf-8') as fp:
    json.dump(all_inputs, fp, indent=2)

print(f"Total TextInput parsed: {len(all_inputs)}")
under_16 = [x for x in all_inputs if x['effective_fs'] is not None and x['effective_fs'] < 16]
missing = [x for x in all_inputs if x['effective_fs'] is None]
gte_16 = [x for x in all_inputs if x['effective_fs'] is not None and x['effective_fs'] >= 16]
print(f"fontSize >= 16: {len(gte_16)}")
print(f"fontSize < 16: {len(under_16)}")
print(f"missing fontSize: {len(missing)}")
