---
name: team-work
description: Multi-agent team orchestration — spawn subagents for parallel research, coding, review, and synthesis. Use when the task has disjoint subtasks, needs parallel exploration, or benefits from reviewer/generator split.
---

# Team Work — Multi-Agent Orchestrator (100% Free via 9Router)

This skill implements a multi-agent pipeline using **100% free models** routed through **9Router (opencode provider)**. All LLM calls go through `localhost:20128/v1`, no paid API keys needed. Uses structured JSON for orchestration and SEARCH/REPLACE blocks for code changes.

## 🌐 Language Rule
- **User-facing** (replies, summaries, errors, logs shown to user): **Tiếng Việt**
- **Internal** (subagent prompts, code, JSON, thinking, comments): **English**

---

## Setup

### Requirements
1. **9Router** running locally (port 20128) — [9Router skill](../9router/SKILL.md)
2. **opencode provider** connected to 9Router (cung cấp OC free models)
3. Python 3.10+ with `openai` package

### Environment variables
```bash
set NINEROUTER_URL=http://localhost:20128
set NINEROUTER_KEY=sk-...   # optional, only if 9Router requires auth

# Optional: override model per tier (default = OC free models, benchmark-optimized)
set TEAMWORK_MODEL_FAST=oc/hy3-free
set TEAMWORK_MODEL_MEDIUM=oc/north-mini-code-free
set TEAMWORK_MODEL_STRONG=oc/big-pickle
set TEAMWORK_MODEL_REVIEW=oc/deepseek-v4-flash-free
set TEAMWORK_MODEL_FIX=oc/north-mini-code-free
set TEAMWORK_MODEL_FALLBACK=oc/deepseek-v4-flash-free
```

### Model tiers (100% FREE, benchmark-optimized per step)
| Tier | Default model | Used for | Rationale |
|---|---|---|---|
| fast | `oc/hy3-free` | Context detection, prompt refinement | JSON nhanh (2.6s) |
| medium | `oc/north-mini-code-free` | Planning, task breakdown | Output dài, tránh sót task |
| strong | `oc/big-pickle` | Code generation | Code dài nhất (1006 tok), chất nhất |
| review | `oc/deepseek-v4-flash-free` | Code review | Consistency, bạn quen behavior |
| fix | `oc/north-mini-code-free` | Auto-fix linter errors | Cân bằng tốc độ/chất lượng |
| fallback | `oc/deepseek-v4-flash-free` | Retry khi model chính lỗi | |

> [!NOTE]
> Excluded: `oc/mimo-v2.5-free` (broken, code output rỗng), `oc/nemotron-3-ultra-free` (chậm 11s avg)

---

## ⚡ When to Use (and When NOT to)
- **Use when**: The task has 2+ independent components (e.g. backend api + frontend view), requires strict verification loops, or needs a distinct Planner -> Executor -> Reviewer flow.
- **Do NOT use when**: The task is small (≤ 30 mins to do manually), touches only 1 file with minimal code changes, or does not need multiple subagents.
- **Threshold**: If task-breaker outputs ≤ 2 tasks, run them sequentially without spawning parallel agents.

---

## 🛠️ Folder Architecture
The orchestration logic and helper utilities are modularized into Python script files:
- [patcher.py](file:///e:/posa/.agents/skills/team-work/scripts/patcher.py): Implements patch application (`CodePatcher`) for parsing `<<<< SEARCH` and `<<<< CREATE` blocks.
- [linter.py](file:///e:/posa/.agents/skills/team-work/scripts/linter.py): Automatic local linter.
- [orchestrator.py](file:///e:/posa/.agents/skills/team-work/scripts/orchestrator.py): Main async pipeline runner with 9Router client and model tier routing.

---

## 🔄 Pipeline Workflow
```
Context-Detector ➜ Refiner ➜ Planner ➜ Task-Breaker ➜ Coder (Parallel with Serialization) ➜ Linter ➜ Reviewer ➜ Done
```

### 1. Conflict Prevention (Race Conditions)
To prevent agents from overwriting each other when modifying the *same file*, the orchestrator performs **Dependency Serialization**:
- If Task A and Task B both modify `src/main.py`, Task B is dynamically updated to depend on Task A.
- Task B will run only after Task A has successfully written its changes and passed the linter check.
- Tasks modifying *different files* still execute in parallel.

### 2. Context Detector & Refiner (JSON Mode)
- **Context Detector** scans the workspace first to identify programming language, frameworks, and active linter commands.
- **Refiner** converts the raw prompt into a spec, incorporating the codebase context (avoiding hallucinated files/classes).

### 3. Planner & Task-Breaker (JSON Mode)
Break down the request into a list of atomic tasks where each task touches exactly one file.
```json
[
  {"id":"t1","action":"create","file":"src/auth.py","desc":"JWT encode/decode + login/logout endpoints","dep":[]},
  {"id":"t2","action":"create","file":"src/middleware.py","desc":"Auth guard dependency injection","dep":["t1"]}
]
```

### 4. Coder Agent (Plain-Text / XML Tags)
The Coder agent returns search/replace or create blocks directly to bypass JSON string escaping crashes.

**Modify format:**
```
<<<< SEARCH
<exact lines from original file>
====
<modified lines to replace>
>>>> REPLACE
```

**Create format:**
```
<<<< CREATE src/auth.py
<complete new file content>
>>>> END CREATE
```

### 5. Fast Validator (Local Linter) & Reviewer (JSON Mode)
- **Linter**: Verifies syntax locally. If it fails, loops Coder (up to 3 times) before calling the Reviewer.
- **Reviewer**: Evaluates logic correctness. Maximum 5 loops. Escalates to user if review loops fail.

---

## 📋 Project Plan Update Protocol (BẮT BUỘC)

Sau mỗi pipeline hoàn thành (status = "done"), orchestrator PHẢI cập nhật file `implementation_plan.md` trong thư mục brain của conversation.

### Rules:
1. **Append, không rewrite**: Đọc nội dung hiện tại → thêm section mới ở cuối. Không xoá nội dung cũ.
2. **Section format**:
   ```markdown
   ## [YYYY-MM-DD] Tiêu đề ngắn
   
   ### Đã làm
   - File A: thêm chức năng X (trạng thái)
   - File B: sửa lỗi Y
   
   ### Đang làm / Tiếp theo
   - Module Z: cần implement còn thiếu (nếu có)
   
   ### Blockers / Vấn đề
   - ...
   ```
3. **Thời điểm**: Ngay sau khi `save_state(state)` với step="done" trong `run_review_loop` or `run_pipeline`.
4. **Brain directory**: Đường dẫn brain lấy từ environment `ANTIGRAVITY_BRAIN_DIR` hoặc mặc định `C:\Users\locthanhit\.gemini\antigravity\brain\{conversation_id}`.
5. **Không update nếu**: Task bị hủy giữa chừng hoặc không có thay đổi file thực tế (chỉ research).
