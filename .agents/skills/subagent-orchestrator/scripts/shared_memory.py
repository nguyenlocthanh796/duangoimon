"""
Shared Memory — file-based communication between subagents.
Subagents can read/write results for other agents to consume.
Auto-compresses when exceeding 10KB.
"""

import json
import os
from pathlib import Path
from datetime import datetime

MEMORY_FILE = Path(".agentic/shared_memory.json")


class SharedMemory:
    def __init__(self, memory_file: str | Path = None):
        self.file = Path(memory_file) if memory_file else MEMORY_FILE
        self._data = self._load()

    def _load(self) -> dict:
        if self.file.exists():
            try:
                return json.loads(self.file.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}

    def _save(self):
        self.file.parent.mkdir(parents=True, exist_ok=True)
        self.file.write_text(json.dumps(self._data, indent=2, ensure_ascii=False), encoding="utf-8")

    def set(self, key: str, value, metadata: dict = None):
        """Write a value to shared memory."""
        entry = {
            "value": value,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {},
        }
        self._data[key] = entry
        if self._estimate_size() > 10240:  # 10KB
            self._compress()
        self._save()

    def get(self, key: str, default=None):
        """Read a value from shared memory."""
        entry = self._data.get(key)
        if entry:
            return entry["value"]
        return default

    def get_all(self) -> dict:
        """Get all memory entries."""
        return {k: v["value"] for k, v in self._data.items()}

    def get_recent(self, n: int = 5) -> str:
        """Get last N entries as formatted string (for context injection)."""
        items = list(self._data.items())[-n:]
        parts = []
        for k, v in items:
            val = v["value"]
            if isinstance(val, str) and len(val) > 500:
                val = val[:500] + f"\n... [truncated, {len(val)} chars total]"
            parts.append(f"[{v['timestamp']}] {k}: {json.dumps(val, ensure_ascii=False)[:300]}")
        return "\n".join(parts)

    def delete(self, key: str):
        self._data.pop(key, None)
        self._save()

    def clear(self):
        self._data = {}
        self._save()

    def _estimate_size(self) -> int:
        return len(json.dumps(self._data, ensure_ascii=False))

    def _compress(self):
        """Compress memory: truncate old large entries."""
        summaries = {}
        for k, v in self._data.items():
            val = v["value"]
            if isinstance(val, str) and len(val) > 300:
                summaries[k] = val[:300] + f" [... {len(val)} chars]"
        for k, summary in summaries.items():
            self._data[k]["value"] = summary
            self._data[k]["metadata"]["compressed"] = True
