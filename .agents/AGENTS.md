# POSA Workspace Rules

## 🌐 Ngôn ngữ
- **User-facing** (replies, summaries, errors, chat): **Tiếng Việt**
- **Internal** (code comments, JSON, prompts, tool calls, logs): **English**

---

## 📦 Skill Usage

### Khi nào dùng skill nào?

| Skill | Khi nào dùng |
|---|---|
| **subagent-orchestrator** | Task phức tạp, cần nhiều chuyên gia (code + review + research), hoặc cần parallel execution |
| **team-work** | Task code đơn thuần, sequential pipeline, cần code patch + linter |
| **security-auditor** | Kiểm tra bảo mật, pentest tự động — chạy bandit, semgrep, safety |
| **Direct coding** | Task nhỏ (1-2 files), fix bug đơn giản, optimization |
| **9router** | Luôn dùng làm gateway, không gọi API provider trực tiếp |

### Quy tắc chọn skill:
1. Task ≤ 30 phút, 1-2 files → direct coding
2. Task cần code + review → team-work
3. Task phức tạp, multi-step, cần research + code + review → subagent-orchestrator
4. Không bao giờ gọi API provider trực tiếp — luôn qua 9Router

---

## 🧠 Model Configuration (DEFAULT_MODEL)

Chỉ dùng **2 models**, chọn qua biến môi trường `DEFAULT_MODEL`:

| Model | Khi nào dùng | Ghi chú |
|---|---|---|
| `oc/deepseek-v4-flash-free` | Mặc định — 100% free | Không cần API key, nhanh, reliable |
| `gc/gemini-2.5-pro` | Optional — quality cao hơn | Cần Gemini API key trong Gemini CLI |

Mặc định = `oc/deepseek-v4-flash-free`. Đổi qua `gc/gemini-2.5-pro` nếu cần code/reasoning tốt hơn.

> [!WARNING]
> `gc/gemini-2.5-pro` và `oc/deepseek-v4-flash-free` đều không support `response_format: {"type": "json_object"}` — orchestrator tự extract JSON từ text response.

---

## 🏗 Kiến trúc & Code Quality

### File Organization
```
.agents/
  skills/
    <skill-name>/
      SKILL.md          # Documentation + instructions
      scripts/           # Python scripts
        run.py           # CLI entry point
```

### Code Standards
- **Python**: PEP 8, type hints, async/await cho I/O
- **Error handling**: Graceful fallback, circuit breaker pattern
- **Logging**: structured logging (timestamp, level, module)
- **State**: Persist to `.agentic/<skill>_state.json` hoặc shared memory

### Multi-Agent Patterns
- **Orchestrator gọi subagent** → dùng function calling (`tool_calls`)
- **Subagent trả về** → luôn dùng `agent_response` tool với structured JSON
- **Parallel execution** → tasks độc lập chạy `asyncio.gather`
- **Fallback** → primary model fail → fallback model (circuit breaker: 3 lần)

---

## 🔄 Workflow Rules

### Khi implement tính năng mới:
1. **Phân tích** — dùng `subagent-orchestrator` để research nếu cần
2. **Lên plan** — không code ngay, viết implementation_plan.md trước
3. **Code** — dùng team-work hoặc subagent-orchestrator
4. **Review** — luôn review code (human hoặc review agent)
5. **Test** — chạy test suite trước khi merge

### Khi fix bug:
1. Xác định nguyên nhân gốc (không mò mẫm)
2. Fix đúng chỗ, không gây side effects
3. Thêm test case nếu có thể

---

## 🚫 Anti-Patterns (CẤM)

- **KHÔNG** gọi API provider trực tiếp — luôn qua 9Router
- **KHÔNG** dùng paid models khi có OC free alternative
- **KHÔNG** hardcode model names trong business logic — dùng config/tiers
- **KHÔNG** chạy sequential tasks có thể chạy parallel
- **KHÔNG** dùng `oc/hy3-free` cho JSON response_format
- **KHÔNG** tạo file mới ở root project (nếu là script tạm → xoá sau)

---

## 📐 Layout Stability
- **KHÔNG thay đổi layout, cấu trúc component, hoặc style của bất kỳ màn hình/module nào nếu không có yêu cầu rõ ràng từ user.**
- Nếu user yêu cầu thay đổi layout, phải phân tích kỹ:
  1. File nào bị ảnh hưởng?
  2. Thay đổi có ảnh hưởng module khác không?
  3. Props/state có thay đổi không?
  4. Responsive có vỡ không?
- Chỉ thực hiện sau khi user xác nhận phân tích.
- Các fix TypeScript, optimization nhỏ (font size, padding, color) không cần hỏi lại.

---

## 🛠️ File Edit Guidelines

Khi multi-edit file:
- Dùng `multi_replace_file_content` cho edits không contiguous
- Dùng `replace_file_content` cho single block
- Verify edit thành công bằng `view_file` trước khi chạy test
- Clean up test files sau khi xong

---

## 📱 Hướng dẫn Chuẩn hóa UI (UI Standardization)

Giao diện của POSA tuân thủ nghiêm ngặt 3 triết lý thiết kế hiện đại:
1. **Flat Design & Edge-to-edge Layout** (Lưới phẳng, tràn viền)
2. **Minimalist Typography** (Chuẩn 4 cỡ chữ, auto scale trên iPad)
3. **Bright & Clear Palette** (Môi trường xám lạnh, điểm nhấn màu Cam)

**⚠️ QUY TẮC QUAN TRỌNG:**
Thay vì viết toàn bộ quy tắc vào đây, chúng tôi đã đóng gói hệ thống thiết kế này thành một Skill. 
Bất cứ khi nào user yêu cầu "chuẩn hóa giao diện" (standardize UI) một màn hình mới, bạn **BẮT BUỘC PHẢI DÙNG CÔNG CỤ `view_file` ĐỂ ĐỌC FILE SKILL SAU ĐÂY TRƯỚC KHI CODE:**
`E:\posa\.agents\skills\ui-standardization\SKILL.md`

---

## ✅ Test Requirements
- Python scripts: chạy `python run.py --test` trước khi commit
- Luôn verify model connectivity trước khi dùng model mới
- State persistence: test resume pipeline
