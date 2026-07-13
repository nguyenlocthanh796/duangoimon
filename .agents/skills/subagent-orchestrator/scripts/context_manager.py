"""
Context Manager — compress and truncate context windows.
DeepSeek V4 Flash (free) has limited context, so we need to be strategic.
"""

import json
import re


class ContextManager:
    @staticmethod
    def compress(content: str, max_len: int = 2000) -> str:
        """Smart compression: extract key info, truncate with summary."""
        if len(content) <= max_len:
            return content

        # If it's code, try to keep structure
        if any(marker in content for marker in ["def ", "class ", "import ", "```"]):
            return ContextManager._compress_code(content, max_len)

        # If it's JSON, try to keep schema
        if content.strip().startswith("{") or content.strip().startswith("["):
            return ContextManager._compress_json(content, max_len)

        # General text: keep first 60% and last 40%
        return ContextManager._compress_text(content, max_len)

    @staticmethod
    def _compress_code(content: str, max_len: int) -> str:
        lines = content.split("\n")
        result = []
        kept = 0
        for line in lines:
            stripped = line.strip()
            # Always keep imports, function/class defs, comments
            if any(stripped.startswith(p) for p in ["import ", "from ", "def ", "class ", "#", "//", "/*", "*/"]):
                result.append(line)
                kept += len(line) + 1
            elif kept < max_len * 0.7:
                result.append(line)
                kept += len(line) + 1
            else:
                result.append(f"# ... [{len(lines) - len(result)} lines skipped]")
                break
        return "\n".join(result)

    @staticmethod
    def _compress_json(content: str, max_len: int) -> str:
        try:
            data = json.loads(content)
            if isinstance(data, dict):
                # Keep keys, truncate long values
                truncated = {}
                for k, v in data.items():
                    if isinstance(v, str) and len(v) > 200:
                        truncated[k] = v[:200] + "..."
                    elif isinstance(v, (list, dict)):
                        s = json.dumps(v, ensure_ascii=False)
                        if len(s) > 300:
                            truncated[k] = f"[truncated: {len(s)} bytes]"
                        else:
                            truncated[k] = v
                    else:
                        truncated[k] = v
                return json.dumps(truncated, indent=2, ensure_ascii=False)[:max_len]
        except json.JSONDecodeError:
            pass
        return content[:max_len]

    @staticmethod
    def _compress_text(content: str, max_len: int) -> str:
        """Keep first 60% and last 40%. Add context bridge."""
        first = content[:int(max_len * 0.6)]
        last = content[-int(max_len * 0.35):]
        return f"{first}\n\n[... {len(content) - int(max_len * 0.95)} chars compressed ...]\n\n{last}"

    @staticmethod
    def truncate(messages: list, max_tokens: int = 8000) -> list:
        """Truncate message history to fit context window."""
        # Rough estimate: 1 token ≈ 4 chars
        max_chars = max_tokens * 4
        total = sum(len(m.get("content", "")) for m in messages)

        if total <= max_chars:
            return messages

        # Keep system message, trim from oldest user messages
        kept = []
        remaining = max_chars

        for m in messages:
            if m.get("role") == "system":
                kept.append(m)
                remaining -= len(m.get("content", ""))
            else:
                break

        # Keep recent messages (last ones are more important)
        recent = [m for m in messages if m.get("role") != "system"]
        for m in reversed(recent):
            content_len = len(m.get("content", ""))
            if remaining - content_len > 0:
                kept.insert(len(kept), m)  # Insert after system messages
                remaining -= content_len
            else:
                # Truncate this message
                truncated = m.copy()
                truncated["content"] = m["content"][:max(0, remaining - 100)]
                if truncated["content"]:
                    truncated["content"] += "\n[message truncated...]"
                    kept.insert(len(kept), truncated)
                break

        return kept
