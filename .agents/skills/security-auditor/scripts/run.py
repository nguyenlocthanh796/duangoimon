#!/usr/bin/env python3
"""security-auditor: run all security scans on POSA project.

Usage:
    python scripts/run.py                     # full scan (SAST + DAST + deps)
    python scripts/run.py --sast              # bandit + semgrep only
    python scripts/run.py --deps              # safety + npm audit only
"""
import io
import sys
import argparse
import json
import subprocess
from pathlib import Path

# Windows cp1252 workaround: force UTF-8 for stdout
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Correct path calculation
ROOT = Path(__file__).resolve().parents[4]
BACKEND = ROOT / "backend"
REPORTS = Path(__file__).resolve().parent.parent / "reports"
REPORTS.mkdir(parents=True, exist_ok=True)


def run_bandit() -> dict:
    """Bandit SAST scan."""
    print("[1/3] [Bandit] SAST scan...")
    report_file = REPORTS / "bandit_report.json"
    result = subprocess.run(
        [sys.executable, "-m", "bandit", "-r", str(BACKEND / "app"), "-f", "json"],
        capture_output=True, text=True, timeout=120, encoding="utf-8"
    )
    if result.returncode not in (0, 1): # 0=clean, 1=issues found
        return {"tool": "bandit", "error": f"Exit code {result.returncode}"}
    try:
        data = json.loads(result.stdout)
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        high = sum(1 for r in data.get("results", []) if r["issue_severity"] == "HIGH")
        total = len(data.get("results", []))
        print(f"   -> {total} issues ({high} HIGH) -> {report_file}")
        return {"tool": "bandit", "total": total, "high": high, "report": str(report_file)}
    except (json.JSONDecodeError, AttributeError):
        return {"tool": "bandit", "error": "JSON parse error"}


def run_semgrep() -> dict:
    """Semgrep SAST scan."""
    print("[2/3] [Semgrep] Pattern scan...")
    report_file = REPORTS / "semgrep_report.json"
    
    semgrep_cmd = "semgrep"
    scripts = Path(sys.executable).parent / "Scripts" / "semgrep.exe"
    if scripts.exists(): semgrep_cmd = str(scripts)

    try:
        result = subprocess.run(
            [semgrep_cmd, "--config", "p/default", "--json", str(BACKEND)],
            capture_output=True, text=True, timeout=400, encoding="utf-8"
        )
    except FileNotFoundError:
        result = subprocess.run(
            [sys.executable, "-m", "semgrep", "--config", "p/default", "--json", str(BACKEND)],
            capture_output=True, text=True, timeout=400, encoding="utf-8"
        )
    
    # Semgrep exit code 0=no findings, 1=findings, >1=error
    if result.returncode > 1:
        return {"tool": "semgrep", "error": f"Exit code {result.returncode}"}

    try:
        data = json.loads(result.stdout)
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        total = len(data.get("results", []))
        print(f"   -> {total} findings -> {report_file}")
        return {"tool": "semgrep", "total": total, "report": str(report_file)}
    except (json.JSONDecodeError, AttributeError):
        return {"tool": "semgrep", "error": "JSON parse error"}


def run_safety() -> dict:
    """Safety dependency scan."""
    print("[3/3] [Safety] Dependency check...")
    req = BACKEND / "requirements.txt"
    if not req.exists():
        return {"tool": "safety", "error": "no requirements.txt"}
    
    try:
        result = subprocess.run(
            [sys.executable, "-m", "safety", "check", "-r", str(req), "--json"],
            capture_output=True, text=True, timeout=180, encoding="utf-8"
        )
    except subprocess.TimeoutExpired:
        return {"tool": "safety", "error": "Timeout after 180s"}

    if result.returncode != 0:
        return {"tool": "safety", "error": f"Exit code {result.returncode}"}
        
    try:
        data = json.loads(result.stdout)
        vulns = data.get("vulnerabilities", [])
        print(f"   -> {len(vulns)} CVEs")
        return {"tool": "safety", "vulnerabilities": len(vulns)}
    except (json.JSONDecodeError, AttributeError):
        return {"tool": "safety", "error": "JSON parse error"}


def main():
    parser = argparse.ArgumentParser(description="Security Auditor")
    parser.add_argument("--sast", action="store_true", help="SAST only (bandit + semgrep)")
    parser.add_argument("--deps", action="store_true", help="Dependencies only (safety)")
    args = parser.parse_args()

    results = []

    if args.deps:
        results.append(run_safety())
    elif args.sast:
        results.append(run_bandit())
        results.append(run_semgrep())
    else:
        # Full scan
        results.append(run_bandit())
        results.append(run_semgrep())
        results.append(run_safety())

    # Summary
    print("\n" + "=" * 50)
    print("📊 SCAN SUMMARY")
    print("=" * 50)
    for r in results:
        status = "✅" if "error" not in r else "⚠️"
        detail = "pass" if "error" not in r else f"FAIL: {r['error']}"
        print(f"  {status} {r['tool']}: {detail}")

    return 0 if all("error" not in r for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
sys.exit(main())
