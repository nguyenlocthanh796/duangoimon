# Team Work — Flash-Optimized Multi-Agent Orchestrator

This skill implements a high-performance, low-cost multi-agent pipeline optimized for DeepSeek Flash models. It utilizes structured JSON formatting for orchestration (Planning/Task breakdown) and plain-text XML templates for code modification (SEARCH/REPLACE & CREATE).

## 🌐 Language Rule
- **User-facing** (replies, summaries, errors, logs shown to user): **Tiếng Việt**
- **Internal** (subagent prompts, code, JSON, thinking, comments): **English**

---

## ⚡ When to Use (and When NOT to)
- **Use when**: The task has 2+ independent components (e.g. backend api + frontend view), requires strict verification loops, or needs a distinct Planner -> Executor -> Reviewer flow.
- **Do NOT use when**: The task is small (≤ 30 mins to do manually), touches only 1 file with minimal code changes, or does not need multiple subagents.
- **Threshold**: If task-breaker outputs ≤ 2 tasks, run them sequentially without spawning parallel agents.

---

## 🛠️ Folder Architecture
The orchestration logic and helper utilities are modularized into Python script files:
- patcher.py: Implements patch application (`CodePatcher`) for parsing `<<<< SEARCH` and `<<<< CREATE` blocks.
- linter.py: Automatic local linter.
- orchestrator.py: Main async pipeline runner. Performs context detection first to guide refiner, and serializes overlapping tasks.

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

## 💾 State Persistence & History Compression
The state is persisted at `.agents/teamwork_state.json`.

- **History Compression**: Only the last 5 entries of `fast_logs` are injected as historical context when spawning subagents.
- **Resume Flow**: Step 0 checks if `teamwork_state.json` exists. If active, prompts: *"📂 Phát hiện pipeline đang chạy dở: step={step}. Tiếp tục? [y/n]"*.

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
   ```
