# DISPATCH LOG

## 2026-09-17T08:45:59Z

Caller: parent (id: dccbce09-7168-44c9-b4e9-ef06fd343dea)
Role: Project Orchestrator
Task:
Kế hoạch nâng cấp & quy chuẩn hóa toàn bộ dự án OngChu Lean POS về cỡ chữ (Typography 7 cấp) và Bảng màu Dual-Theme (Anti-Glare Dark Mode & Indochine Light Mode) theo đúng chuẩn Apple Human Interface Guidelines (HIG) và công thái học F&B di động.

Requirements:
1. R1. Chuẩn Hóa Typography 7 Cấp Cân Bằng (Apple HIG):
   - 100% giao diện POS tuân thủ thang đo Typography 7 cấp (xxs, xs, sm, md, lg, xl, display), trong đó variant="md" (18px) gánh 85–90% nội dung POS.
   - Tiêu đề chính màn hình (<AppHeader>) sử dụng variant="lg" (22px bold).
   - 100% TextInput đạt fontSize >= 16px chống iOS WebKit auto-zoom.
2. R2. Chuẩn Hóa Bảng Màu Dual-Theme Indochine & Anti-Glare:
   - Tối ưu hóa bảng màu Light Mode (Giấy Dó #F9F6F0, Gỗ Mun #1C1917, Đồng Thau Phin #B45309).
   - Dark Mode Anti-Glare (Cà Phê #14110E, Gỗ Gụ #1E1813, Trắng Ngà #F3EFEA, Vàng Đồng Thau #B45309 chống lóa mắt).
   - Triệt tiêu hoàn toàn màu Hex hardcode trong các file .tsx (sử dụng token qua useTheme()).
3. R3. Đồng Nhất Luồng Thanh Toán Cam Hổ Phách Apple (Apple Warm Orange Action Thread):
   - Đồng nhất 100% các nút hành động chốt thanh toán [Gọi Món -> Giỏ Hàng -> Nghiệp Vụ -> Xong & In Bill] dùng Cam Hổ Phách #B45309 (theme.brand.accent) với chữ trắng theme.text.onBrand.
4. R4. Cập Nhật Tài Liệu Quy Chuẩn Design System:
   - Bổ sung các quy chuẩn nâng cấp về Typography và Bảng màu Apple HIG vào file AGENTS.md và GEMINI.md.

Acceptance Criteria:
- 100% file .tsx trong /frontend tuân thủ component <AppText> và token useTheme().
- Biên dịch TypeScript `cd frontend && npx tsc --noEmit` đạt 0 lỗi (0 type errors).
- Kiểm thử hiển thị trên thiết bị thật Android qua ADB MCP Server (901SO).
- Cập nhật đầy đủ thông số trong AGENTS.md và GEMINI.md.
