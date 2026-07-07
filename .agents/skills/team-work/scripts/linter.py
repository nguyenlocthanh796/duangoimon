import subprocess
from pathlib import Path

LINTER_DEFAULTS = {
    ".py":   "flake8 {file}",
    ".js":   "npx eslint {file} --max-warnings=0",
    ".ts":   "npx eslint {file} --max-warnings=0",
    ".tsx":  "npx eslint {file} --max-warnings=0",
    ".rs":   "cargo check --quiet",
    ".go":   "go vet {file}",
    ".rb":   "ruby -c {file}",
    ".java": "javac -Xlint:all {file}",
    ".cs":   "dotnet build --no-restore -v q",
}

def run_linter(file_path: str, linter_cmd: str | None = None) -> tuple[bool, str]:
    """
    Runs linter locally.
    Returns: (pass, error_message)
    """
    if not linter_cmd:
        ext = Path(file_path).suffix
        linter_cmd = LINTER_DEFAULTS.get(ext)
    if not linter_cmd:
        return True, "No linter configured for this file type"

    cmd = linter_cmd.format(file=file_path)
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return True, "PASS"
        error = (result.stderr or result.stdout)[:500]
        return False, error
    except Exception as e:
        return False, f"Linter runner exception: {str(e)}"
