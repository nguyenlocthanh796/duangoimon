#!/usr/bin/env python3
"""
Android ADB MCP Server for Antigravity & AI Coding Agents
Standard: JSON-RPC 2.0 Stdio MCP Specification
Connects connected Android devices (e.g., Sony Xperia 5 / Emulators) with Antigravity
Includes:
- Robust image verification & automatic downscaling (prevents corrupted/truncated PNGs & HTTP 400 INVALID_ARGUMENT)
- adb_dump_ui tool for instant text-based UI hierarchy inspection without image overhead
- Proper device targeting (device/device_id parameter support)
"""

import sys
import json
import subprocess
import os
import shutil
import xml.etree.ElementTree as ET

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")

ADB_PATH = r"D:\tools\platform-tools\adb.exe"
if not os.path.exists(ADB_PATH):
    ADB_PATH = shutil.which("adb") or "adb"

IGNORED_DEVICES = ["192.168.50.233:5555"]

def get_connected_device():
    env_serial = os.environ.get("ANDROID_SERIAL")
    if env_serial:
        return env_serial
    try:
        out = subprocess.run([ADB_PATH, "devices"], capture_output=True, text=True, timeout=5).stdout
        lines = [l.split()[0] for l in out.strip().splitlines()[1:] if "\tdevice" in l and l.split()[0] not in IGNORED_DEVICES]
        if "emulator-5554" in lines:
            return "emulator-5554"
        if lines:
            return lines[0]
    except Exception:
        pass
    return "emulator-5554"

def run_adb(args, timeout=15, device=None):
    serial = device or get_connected_device()
    if args and args[0] != "devices" and "-s" not in args:
        cmd = [ADB_PATH, "-s", serial] + args
    else:
        cmd = [ADB_PATH] + args
    try:
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="ignore"
        )
        return res.stdout.strip()
    except Exception as e:
        return f"ADB Error: {str(e)}"

TOOLS = [
    {
        "name": "adb_screenshot",
        "description": "Chụp ảnh màn hình điện thoại Android, tự động xác thực toàn vẹn và nén kích thước chống lỗi HTTP 400",
        "inputSchema": {
            "type": "object",
            "properties": {
                "device": {
                    "type": "string",
                    "description": "Serial thiết bị (VD: emulator-5554 hoặc QV72022C31)"
                },
                "save_path": {
                    "type": "string",
                    "description": "Đường dẫn file PNG lưu trên máy tính (VD: d:/duanpos-ongchu/.temp/screen.png)"
                }
            }
        }
    },
    {
        "name": "adb_dump_ui",
        "description": "Trích xuất nhanh cây phân cấp giao diện (UI Hierarchy) và văn bản hiển thị trên màn hình Android mà không cần chụp ảnh",
        "inputSchema": {
            "type": "object",
            "properties": {
                "device": {
                    "type": "string",
                    "description": "Serial thiết bị (VD: emulator-5554 hoặc QV72022C31)"
                }
            }
        }
    },
    {
        "name": "adb_tap",
        "description": "Chạm vào tọa độ (x, y) trên màn hình điện thoại Android",
        "inputSchema": {
            "type": "object",
            "properties": {
                "x": {"type": "integer", "description": "Tọa độ X pixel"},
                "y": {"type": "integer", "description": "Tọa độ Y pixel"},
                "device": {"type": "string", "description": "Serial thiết bị"}
            },
            "required": ["x", "y"]
        }
    },
    {
        "name": "adb_swipe",
        "description": "Vuốt màn hình từ tọa độ (x1, y1) tới (x2, y2)",
        "inputSchema": {
            "type": "object",
            "properties": {
                "x1": {"type": "integer"},
                "y1": {"type": "integer"},
                "x2": {"type": "integer"},
                "y2": {"type": "integer"},
                "duration_ms": {"type": "integer", "default": 300},
                "device": {"type": "string", "description": "Serial thiết bị"}
            },
            "required": ["x1", "y1", "x2", "y2"]
        }
    },
    {
        "name": "adb_input_text",
        "description": "Nhập văn bản vào ô input đang focus trên điện thoại",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Nội dung cần nhập"},
                "device": {"type": "string", "description": "Serial thiết bị"}
            },
            "required": ["text"]
        }
    },
    {
        "name": "adb_keyevent",
        "description": "Gửi mã phím Android (224: Bật sáng màn hình, 3: Home, 4: Back, 82: Mở khóa, 66: Enter)",
        "inputSchema": {
            "type": "object",
            "properties": {
                "keycode": {"type": "integer", "description": "Android KeyCode"},
                "device": {"type": "string", "description": "Serial thiết bị"}
            },
            "required": ["keycode"]
        }
    },
    {
        "name": "adb_open_url",
        "description": "Mở URL (exp://localhost:8085 hoặc http://...) trong Expo Go hoặc Chrome trên điện thoại",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL cần mở"},
                "package_name": {"type": "string", "description": "Package app (VD: host.exp.exponent)", "default": "host.exp.exponent"},
                "device": {"type": "string", "description": "Serial thiết bị"}
            },
            "required": ["url"]
        }
    },
    {
        "name": "adb_reverse_ports",
        "description": "Thiết lập đảo ngược cổng USB (Reverse Port Forward) cho cổng 8085 và 8080",
        "inputSchema": {
            "type": "object",
            "properties": {
                "device": {"type": "string", "description": "Serial thiết bị"}
            }
        }
    },
    {
        "name": "adb_list_devices",
        "description": "Liệt kê danh sách thiết bị Android đang kết nối qua USB/WiFi",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    }
]

def optimize_and_verify_image(file_path):
    """Verifies PNG integrity and resizes to optimal dimension to prevent HTTP 400 Bad Request."""
    try:
        from PIL import Image
        with Image.open(file_path) as img:
            img.verify()
        with Image.open(file_path) as img:
            w, h = img.size
            max_w = 540  # Downscale to ergonomic width (shrinks file by ~85% with perfect legibility)
            if w > max_w:
                new_h = int(h * (max_w / w))
                img = img.resize((max_w, new_h), Image.Resampling.LANCZOS)
            img.save(file_path, "PNG", optimize=True)
        return True, img.size, os.path.getsize(file_path)
    except Exception as e:
        return False, None, str(e)

def handle_call_tool(name, arguments):
    device = arguments.get("device") or arguments.get("device_id")

    if name == "adb_screenshot":
        temp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".temp"))
        os.makedirs(temp_dir, exist_ok=True)
        save_path = arguments.get("save_path") or arguments.get("output_path") or os.path.join(temp_dir, "mcp_screen.png")
        os.makedirs(os.path.dirname(os.path.abspath(save_path)), exist_ok=True)

        # 1. Capture to device storage
        run_adb(["shell", "rm", "-f", "/sdcard/mcp_screen.png"], timeout=10, device=device)
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except Exception:
                pass
        run_adb(["shell", "screencap", "-p", "/sdcard/mcp_screen.png"], timeout=15, device=device)
        # 2. Pull to host computer
        pull_out = run_adb(["pull", "/sdcard/mcp_screen.png", save_path], timeout=15, device=device)

        # 3. Verify integrity and downscale
        ok, dims, details = optimize_and_verify_image(save_path)
        if ok:
            kb = details // 1024
            return [{"type": "text", "text": f"Screenshot verified & optimized successfully: {save_path} ({dims[0]}x{dims[1]}, {kb} KB). Status: {pull_out}"}]
        else:
            return [{"type": "text", "text": f"Warning: Screenshot saved to {save_path} but integrity check failed: {details}. Output: {pull_out}"}]

    elif name == "adb_dump_ui":
        run_adb(["shell", "uiautomator", "dump", "/sdcard/mcp_dump.xml"], timeout=10, device=device)
        xml_str = run_adb(["shell", "cat", "/sdcard/mcp_dump.xml"], timeout=10, device=device)
        try:
            root = ET.fromstring(xml_str)
            elements = []
            for node in root.iter("node"):
                text = node.attrib.get("text", "").strip()
                desc = node.attrib.get("content-desc", "").strip()
                res_id = node.attrib.get("resource-id", "").strip()
                bounds = node.attrib.get("bounds", "")
                clickable = node.attrib.get("clickable", "false")
                # Filter out all private use unicode characters (icons/glyphs)
                clean_text = "".join(c for c in (text or desc) if ord(c) < 0xE000 or (0xF8FF < ord(c) < 0xF0000)).strip()
                if clean_text:
                    elements.append(f"- [{clean_text}] (id: {res_id or 'none'}, clickable: {clickable}, bounds: {bounds})")
            summary = "\n".join(elements[:80])
            return [{"type": "text", "text": f"UI Dump ({len(elements)} items found):\n{summary}"}]
        except Exception as e:
            return [{"type": "text", "text": f"UI Dump parsed text:\n{xml_str[:600]}"}]

    elif name == "adb_tap":
        x = arguments.get("x")
        y = arguments.get("y")
        out = run_adb(["shell", "input", "tap", str(x), str(y)], device=device)
        return [{"type": "text", "text": f"Tapped at ({x}, {y}): {out or 'OK'}"}]

    elif name == "adb_swipe":
        x1 = arguments.get("x1")
        y1 = arguments.get("y1")
        x2 = arguments.get("x2")
        y2 = arguments.get("y2")
        dur = arguments.get("duration_ms", 300)
        out = run_adb(["shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(dur)], device=device)
        return [{"type": "text", "text": f"Swiped ({x1},{y1}) -> ({x2},{y2}): {out or 'OK'}"}]

    elif name == "adb_input_text":
        text = arguments.get("text", "")
        escaped_text = text.replace(" ", "%s")
        out = run_adb(["shell", "input", "text", escaped_text], device=device)
        return [{"type": "text", "text": f"Input text '{text}': {out or 'OK'}"}]

    elif name == "adb_keyevent":
        keycode = arguments.get("keycode")
        out = run_adb(["shell", "input", "keyevent", str(keycode)], device=device)
        return [{"type": "text", "text": f"Sent keyevent {keycode}: {out or 'OK'}"}]

    elif name == "adb_open_url":
        url = arguments.get("url")
        pkg = arguments.get("package_name", "host.exp.exponent")
        out = run_adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url, pkg], device=device)
        return [{"type": "text", "text": f"Opened URL {url}: {out}"}]

    elif name == "adb_reverse_ports":
        out1 = run_adb(["reverse", "tcp:8085", "tcp:8085"], device=device)
        out2 = run_adb(["reverse", "tcp:8080", "tcp:8080"], device=device)
        list_out = run_adb(["reverse", "--list"], device=device)
        return [{"type": "text", "text": f"Reversed ports 8085 & 8080:\n{list_out}"}]

    elif name == "adb_list_devices":
        out = run_adb(["devices", "-l"])
        return [{"type": "text", "text": f"Connected devices:\n{out}"}]

    return [{"type": "text", "text": f"Unknown tool: {name}"}]

def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "initialize":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "android-adb-mcp",
                        "version": "1.1.0"
                    }
                }
            }
        elif method == "notifications/initialized":
            continue
        elif method == "tools/list":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": TOOLS
                }
            }
        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            content = handle_call_tool(tool_name, tool_args)
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": content
                }
            }
        elif method == "ping":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {}
            }
        else:
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method '{method}' not found"
                }
            }

        sys.stdout.write(json.dumps(res, ensure_ascii=True) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
