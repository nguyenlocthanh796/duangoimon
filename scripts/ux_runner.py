#!/usr/bin/env python3
"""
Maestro-compatible UX Flow Runner for OngChu Lean POS (Zero-dependency, pure Python + ADB)
Thực thi các kịch bản kiểm thử luồng thao tác UX di động, đo thời gian phản hồi (latency ms)
Bảo toàn 100% triết lý Ponytail: Tối giản, không cài Java/Node cồng kềnh.
"""

import os
import re
import sys
import time
import json
import subprocess
import xml.etree.ElementTree as ET

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ADB_PATH = r"D:\tools\platform-tools\adb.exe"
if not os.path.exists(ADB_PATH):
    ADB_PATH = "adb"

IGNORED_DEVICES = ["QV72022C31"]

class UXFlowRunner:
    def __init__(self, device="emulator-5554"):
        self.device = device
        self.scale = 2.625
        self.init_device()

    def init_device(self):
        out = self.adb(["shell", "wm", "density"])
        m = re.search(r"density:\s*(\d+)", out)
        if m:
            self.scale = int(m.group(1)) / 160.0

    def adb(self, cmd_args, timeout=10):
        full_cmd = [ADB_PATH, "-s", self.device] + cmd_args
        try:
            res = subprocess.run(full_cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="ignore")
            return res.stdout.strip()
        except Exception as e:
            return f"Error: {e}"

    def dump_hierarchy(self):
        self.adb(["shell", "rm", "-f", "/sdcard/window_dump.xml"])
        self.adb(["shell", "uiautomator", "dump", "/sdcard/window_dump.xml"])
        xml_content = self.adb(["shell", "cat", "/sdcard/window_dump.xml"])
        if not xml_content.startswith("<?xml") and "<hierarchy" not in xml_content:
            return None
        try:
            return ET.fromstring(xml_content)
        except Exception:
            return None

    def find_element(self, text_or_regex, clickable_only=False, prefer_bottom=False):
        root = self.dump_hierarchy()
        if root is None:
            return None
        
        import unicodedata
        norm_query = unicodedata.normalize('NFC', text_or_regex)
        try:
            pattern = re.compile(norm_query, re.IGNORECASE)
        except Exception:
            pattern = None

        candidates = []
        for node in root.iter():
            raw_txt = node.attrib.get("text", "")
            raw_desc = node.attrib.get("content-desc", "")
            txt = unicodedata.normalize('NFC', raw_txt)
            desc = unicodedata.normalize('NFC', raw_desc)
            is_clickable = node.attrib.get("clickable") == "true"
            
            is_match = False
            if norm_query.lower() in txt.lower() or norm_query.lower() in desc.lower():
                is_match = True
            elif pattern and (pattern.search(txt) or pattern.search(desc)):
                is_match = True

            if is_match:
                bounds = node.attrib.get("bounds", "")
                m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
                if m:
                    x1, y1, x2, y2 = map(int, m.groups())
                    if x2 > x1 and y2 > y1:
                        candidates.append({
                            "text": txt or desc,
                            "bounds": bounds,
                            "center": ((x1 + x2) // 2, (y1 + y2) // 2),
                            "width_dp": round((x2 - x1) / self.scale, 1),
                            "height_dp": round((y2 - y1) / self.scale, 1),
                            "clickable": is_clickable,
                            "y": y1,
                        })

        if not candidates:
            return None
            
        if prefer_bottom:
            candidates.sort(key=lambda c: (not c["clickable"], -c["y"]))
        else:
            candidates.sort(key=lambda c: (not c["clickable"], c["y"] < 300))
        return candidates[0]

    def tap_on(self, text_pattern, timeout_s=8, prefer_bottom=False):
        start = time.time()
        while time.time() - start < timeout_s:
            el = self.find_element(text_pattern, prefer_bottom=prefer_bottom)
            if el:
                cx, cy = el["center"]
                t0 = time.time()
                self.adb(["shell", "input", "tap", str(cx), str(cy)])
                latency = round((time.time() - t0) * 1000)
                print(f"   ✓ [tapOn] '{text_pattern}' tại ({cx}, {cy}) [{latency}ms]", flush=True)
                return True
            time.sleep(0.4)
        print(f"   ✗ [tapOn FAIL] Không tìm thấy '{text_pattern}' sau {timeout_s}s", flush=True)
        return False

    def assert_visible(self, text_pattern, timeout_s=8):
        start = time.time()
        while time.time() - start < timeout_s:
            el = self.find_element(text_pattern)
            if el:
                print(f"   ✓ [assertVisible] '{text_pattern}' hiện diện ({el['width_dp']}x{el['height_dp']}dp)", flush=True)
                return True
            time.sleep(0.4)
        print(f"   ✗ [assertVisible FAIL] '{text_pattern}' không xuất hiện sau {timeout_s}s", flush=True)
        return False

    def swipe(self, x1, y1, x2, y2, duration_ms=250):
        self.adb(["shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(duration_ms)])
        print(f"   ✓ [swipe] ({x1},{y1}) -> ({x2},{y2})", flush=True)

    def run_flow(self, flow_steps, flow_name="UX Flow"):
        print(f"\n========================================================", flush=True)
        print(f"🚀 THỰC THI LUỒNG UX: {flow_name}", flush=True)
        print(f"   Thiết bị: {self.device}", flush=True)
        print(f"========================================================", flush=True)
        
        flow_start = time.time()
        passed_steps = 0
        total_steps = len(flow_steps)

        for idx, step in enumerate(flow_steps, 1):
            action = step.get("action")
            target = step.get("target")
            print(f"[{idx}/{total_steps}] Bước: {action} '{target or ''}'", flush=True)
            
            success = False
            if action == "tapOn":
                success = self.tap_on(target, timeout_s=step.get("timeout", 10), prefer_bottom=step.get("prefer_bottom", False))
            elif action == "assertVisible":
                success = self.assert_visible(target, timeout_s=step.get("timeout", 10))
            elif action == "swipe":
                self.swipe(step["x1"], step["y1"], step["x2"], step["y2"], step.get("duration", 250))
                success = True
            elif action == "wait":
                time.sleep(step.get("duration", 1))
                success = True

            if success:
                passed_steps += 1
            else:
                print(f"❌ LUỒNG BỊ DỪNG TẠI BƯỚC {idx}: {action} '{target}'", flush=True)
                break
                
            time.sleep(0.5)

        total_time = round((time.time() - flow_start), 2)
        print(f"--------------------------------------------------------", flush=True)
        if passed_steps == total_steps:
            print(f"🎉 HOÀN TẤT 100% LUỒNG UX ({passed_steps}/{total_steps} bước) TRONG {total_time}s", flush=True)
            return True
        else:
            print(f"⚠️ THẤT BẠI TẠI BƯỚC {passed_steps + 1}/{total_steps}", flush=True)
            return False

if __name__ == "__main__":
    runner = UXFlowRunner(device="emulator-5554")
    
    # Đảm bảo khởi đầu từ Sơ Đồ Bàn
    if not runner.find_element("Sơ Đồ Bàn"):
        if runner.find_element("Bàn Ăn", prefer_bottom=True):
            runner.tap_on("Bàn Ăn", timeout_s=2, prefer_bottom=True)
            time.sleep(0.5)
        elif runner.find_element("Sơ Đồ Bàn"):
            runner.tap_on("Sơ Đồ Bàn", timeout_s=1)
            time.sleep(0.5)

    pos_flow = [
        {"action": "assertVisible", "target": "Sơ Đồ Bàn"},
        {"action": "tapOn", "target": r"\+ Mở Bán →|Bàn 01"},
        {"action": "assertVisible", "target": "Tìm món, SKU"},
        {"action": "tapOn", "target": "Trà Sữa Trân Châu Hoàng Gia"},
        {"action": "assertVisible", "target": "Lưu Bếp"},
        {"action": "tapOn", "target": r"\d+\.000 đ", "prefer_bottom": True},
        {"action": "assertVisible", "target": "Thanh Toán"},
        {"action": "assertVisible", "target": "Xong & In Bill"},
        {"action": "tapOn", "target": "Xong & In Bill"},
        {"action": "wait", "duration": 2.0},
        {"action": "assertVisible", "target": "Sơ Đồ Bàn"},
    ]
    
    runner.run_flow(pos_flow, flow_name="POS Order-to-Checkout Flow")
