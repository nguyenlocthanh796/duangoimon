# POSA Workspace Rules

## Layout Stability
- **KHÔNG thay đổi layout, cấu trúc component, hoặc style của bất kỳ màn hình/module nào nếu không có yêu cầu rõ ràng từ user.**
- Nếu user yêu cầu thay đổi layout, phải phân tích kỹ:
  1. File nào bị ảnh hưởng?
  2. Thay đổi có ảnh hưởng module khác không?
  3. Props/state có thay đổi không?
  4. Responsive có vỡ không?
- Chỉ thực hiện sau khi user xác nhận phân tích.
- Các fix TypeScript, optimization nhỏ (font size, padding, color) không cần hỏi lại.
