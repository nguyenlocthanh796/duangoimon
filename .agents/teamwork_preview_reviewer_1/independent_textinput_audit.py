import os
import re
import sys

ROOT = r"d:\duanpos-ongchu\frontend"

def find_all_textinputs():
    results = []
    for base in ["app", "lib"]:
        dir_path = os.path.join(ROOT, base)
        for root, _, files in os.walk(dir_path):
            for file in files:
                if file.endswith((".tsx", ".ts")):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, ROOT)
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    # Find all occurrences of <TextInput
                    matches = list(re.finditer(r'<TextInput\b', content))
                    for m in matches:
                        idx = m.start()
                        # Verify this is a JSX element (not type definition or generic)
                        pre = content[max(0, idx - 20):idx]
                        if "useRef" in pre or re.search(r':\s*$', pre):
                            continue
                        
                        line_num = content[:idx].count("\n") + 1
                        
                        # Find the end of the JSX opening tag
                        tag_end = -1
                        depth = 0
                        in_quote = None
                        for i in range(idx, len(content)):
                            char = content[i]
                            if in_quote:
                                if char == in_quote and content[i-1] != '\\':
                                    in_quote = None
                            else:
                                if char in ('"', "'", '`'):
                                    in_quote = char
                                elif char == '{':
                                    depth += 1
                                elif char == '}':
                                    depth -= 1
                                elif char == '>' and depth == 0:
                                    tag_end = i
                                    break
                        tag_content = content[idx:tag_end + 1] if tag_end != -1 else content[idx:idx+300]
                        
                        # Extract style prop
                        style_match = re.search(r'\bstyle\s*=\s*\{([^}]+)\}', tag_content)
                        # More permissive style extraction for nested braces:
                        style_val = None
                        style_idx = tag_content.find("style=")
                        if style_idx != -1:
                            # Parse balanced braces starting after style=
                            brace_start = tag_content.find("{", style_idx)
                            if brace_start != -1:
                                b_depth = 0
                                for j in range(brace_start, len(tag_content)):
                                    if tag_content[j] == '{':
                                        b_depth += 1
                                    elif tag_content[j] == '}':
                                        b_depth -= 1
                                        if b_depth == 0:
                                            style_val = tag_content[brace_start+1:j]
                                            break

                        results.append({
                            "file": rel_path,
                            "line": line_num,
                            "tag": tag_content.replace("\n", " ")[:120],
                            "style": style_val.strip() if style_val else None,
                            "content": content
                        })
    return results

def resolve_font_size(item):
    style = item["style"]
    content = item["content"]
    if not style:
        return None, "NO_STYLE"

    # Check inline fontSize
    inline_fs = re.search(r'fontSize:\s*([0-9.]+)', style)
    if inline_fs:
        return float(inline_fs.group(1)), "INLINE"

    # Check stylesheet references: s.foo, styles.bar, etc.
    refs = re.findall(r'(?:s|styles|style)\.([a-zA-Z0-9_]+)', style)
    resolved = []
    for ref in refs:
        # Search in StyleSheet.create or object definition for ref: { ... fontSize: X ... }
        # Let's search with regex
        pattern = r'\b' + ref + r'\s*:\s*\{([^}]+)\}'
        m = re.search(pattern, content)
        if m:
            body = m.group(1)
            fs_m = re.search(r'fontSize:\s*([0-9.]+)', body)
            if fs_m:
                resolved.append((ref, float(fs_m.group(1))))
            else:
                resolved.append((ref, None))
        else:
            resolved.append((ref, "NOT_FOUND"))

    for ref, val in resolved:
        if isinstance(val, (int, float)):
            return val, f"STYLESHEET({ref})"

    return None, f"UNRESOLVED({resolved})"

def main():
    items = find_all_textinputs()
    print(f"Total JSX TextInput elements detected: {len(items)}")
    
    under_16 = []
    unresolved = []
    passed = []
    
    for item in items:
        fs, src = resolve_font_size(item)
        if fs is None:
            unresolved.append((item, src))
        elif fs < 16:
            under_16.append((item, fs, src))
        else:
            passed.append((item, fs, src))
            
    print(f"Passed (fontSize >= 16): {len(passed)}")
    print(f"Violating (fontSize < 16): {len(under_16)}")
    print(f"Unresolved / Missing fontSize: {len(unresolved)}")
    
    if under_16:
        print("\nVIOLATIONS (< 16):")
        for it, fs, src in under_16:
            print(f"  {it['file']}:{it['line']} -> {fs} via {src}")
            print(f"    tag: {it['tag']}")
            
    if unresolved:
        print("\nUNRESOLVED / MISSING:")
        for it, src in unresolved:
            print(f"  {it['file']}:{it['line']} -> {src}")
            print(f"    tag: {it['tag']}")
            print(f"    style: {it['style']}")

if __name__ == "__main__":
    main()
