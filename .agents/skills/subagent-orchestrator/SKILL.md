---
name: subagent-orchestrator
description: Multi-agent subagent orchestration — tool-based function calling orchestrator that spawns research, code, review, and synthesis subagents using OC Free models via 9Router. Use when a task benefits from multiple specialized agents working together with orchestrated decision-making.
---

# 🧠 Subagent Orchestrator — True Multi-Agent via Function Calling

Hệ thống **multi-agent thực sự** với tool-based orchestration, không phải sequential pipeline. Orchestrator dùng **function calling** để tự quyết định khi nào gọi subagent nào.

**100% FREE** qua OC (OpenCode) provider trên 9Router — tất cả models đều $0.

---

## Setup

### Requirements
1. **9Router** running locally (port 20128) — xem [9Router skill](../9router/SKILL.md)
2. **OpenCode provider** kết nối với 9Router (cung cấp `oc/` free models)
3. Python 3.10+ với `openai` package

### Environment variables
```bash
set NINEROUTER_URL=http://localhost:20128
set NINEROUTER_KEY=sk-...          # optional
```

### Gemini API Key (cho gc/ models)
Nếu dùng Gemini models (`gc/`), 9Router đã route qua Gemini CLI của bạn — không cần config thêm.

### Fallback OC models
OC models (`oc/`) là OpenCode free — 100% free, không cần API key.

---

## 🧠 Model Configuration (DEFAULT_MODEL)

Chỉ dùng **2 models**, chọn qua biến môi trường `DEFAULT_MODEL`:

| Model | Khi nào dùng | Ghi chú |
|---|---|---|
| `oc/deepseek-v4-flash-free` | Mặc định — 100% free | Không cần API key, nhanh |
| `gc/gemini-2.5-pro` | Optional — quality cao hơn | Cần Gemini API key trong Gemini CLI |

Mặc định = `oc/deepseek-v4-flash-free`. Đổi qua `gc/gemini-2.5-pro` nếu cần code/reasoning tốt hơn.

> [!WARNING]
> `gc/gemini-2.5-pro` và `oc/deepseek-v4-flash-free` đều không support `response_format: {"type": "json_object"}` — orchestrator tự extract JSON từ text response (dùng regex fallback).

> [!NOTE]
> `oc/deepseek-v4-flash-free` không support `response_format: {"type": "json_object"}` — dùng tool calls hoặc regex tương tự.

---

## 🌐 Language Rule
- **User-facing** (replies, summaries, errors): **Tiếng Việt**
- **Internal** (subagent prompts, code, JSON, tool calls): **English**

---

## Architecture

```
User Request
    │
    ▼
Orchestrator (DEFAULT_MODEL)
    │  Tool: research_task
    │  Tool: code_task
    │  Tool: review_task
    │  Tool: synthesize
    │
    ├──► ResearchAgent (DEFAULT_MODEL)
    ├──► CodeAgent (DEFAULT_MODEL)
    ├──► ReviewAgent (DEFAULT_MODEL)
    └──► SynthesisAgent (DEFAULT_MODEL)
```

### Key comparison với team-work cũ:
- ❌ **Sequential pipeline**: Context → Refine → Plan → Execute → Review
- ✅ **True multi-agent**: Orchestrator dùng function calling, tự quyết định routing
- ✅ **Parallel execution**: Subagents không phụ thuộc chạy song song
- ✅ **Shared memory**: Kết quả subagent được lưu để agent khác dùng
- ✅ **Model fallback**: Nếu primary model fail → tự động chuyển fallback

---

## Quick Start

```bash
cd e:\posa
python .agents\skills\subagent-orchestrator\scripts\run.py "viết một FastAPI CRUD cho user management"
```

Hoặc test nhanh:
```bash
python .agents\skills\subagent-orchestrator\scripts\run.py --test
```

---

## Error Handling

- **503 All accounts unavailable** → OC provider hết quota, chờ retry-after
- **Model fail 3 lần** → circuit breaker, chuyển fallback model
- **Tool call parse fail** → retry với strict JSON mode
- **Pipeline gián đoạn** → state persistence, resume được

## Related Skills

| Skill | Why |
|-------|-----|
| [9router](../9router/SKILL.md) | Gateway cho tất cả LLM calls — bắt buộc |
| [team-work](../team-work/SKILL.md) | Dùng cho task đơn giản hơn (sequential pipeline) |
| [security-auditor](../security-auditor/SKILL.md) | Kết quả scan có thể làm input cho orchestrator spawn pentest agents |

## From GitHub: Multi-Agent Patterns

| Tool | Pattern | Description |
|------|---------|-------------|
| **CrewAI** | Role-based agents | Agent cố định role, orchestrator điều phối — tham khảo cho task phức tạp |
| **LangGraph** | State graph | Graph-based agent workflow — tham khảo cho pipeline có branch/loop |

## Alternatives

- [Nayjest/lm-proxy](https://github.com/Nayjest/lm-proxy) ⭐139 — FastAPI LLM proxy, có thể thay thế 9Router nếu cần standalone
- [coaidev/coai](https://github.com/coaidev/coai) ⭐9.2k — Enterprise LLM Gateway full UI
