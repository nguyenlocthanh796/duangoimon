# 🍎 CHECKLIST KIỂM THỬ ĐỊNH KỲ CHUẨN APPLE HUMAN INTERFACE GUIDELINES (HIG)
> **Dự án: OngChu Lean POS — Tiêu Chuẩn Thiết Kế & Công Thái Học Cảm Ứng Di Động**

Tài liệu này được lập ra nhằm duy trì và kiểm soát chất lượng giao diện người dùng (UI/UX) cho mọi màn hình mới hoặc các bản cập nhật tương lai của hệ thống, tuân thủ nguyên tắc **Apple Human Interface Guidelines & Design Resources**.

---

## 📐 1. TYPOGRAPHY & TABULAR NUMS
- [ ] **Thang đo 7 cấp cân bằng**: Sử dụng duy nhất `<AppText>` với các variant `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `display`. Tuyệt đối không can thiệp `fontSize`/`lineHeight` inline.
- [ ] **De-bolding Cực Đoan**: 90% văn bản dùng `weight="normal"` (400), giới hạn tối đa `weight="semibold"` (600), cấm lạm dụng font weight 700/800 trên mobile.
- [ ] **Bảo toàn dấu tiếng Việt**: Giữ `includeFontPadding: false` trong `typography.ts` để tránh cắt dấu hỏi, ngã, nặng.
- [ ] **Tabular Nums 100%**: Tất cả các trường số tiền (`VND`), số lượng (`qty`), mã đơn (`HD-xxxxx`), thời gian (`14:30`) bắt buộc bật `tabularNums={true}`.

---

## 🪟 2. RETINA HAIRLINE & CONTINUOUS SQUIRCLE
- [ ] **Retina Hairline**: 100% đường phân cách và viền card/chip sử dụng `StyleSheet.hairlineWidth`. Cấm dùng viền dày $\ge 1\text{px}$ thô ráp hoặc `borderStyle: 'dashed'`.
- [ ] **Bo góc Squircle (Continuous Corner Radius)**:
  - Nút icon / Controls nhỏ: `borderRadius: 8 - 10px`.
  - Ô nhập liệu TextInput / Nút CTA / Preset chip: `borderRadius: 10 - 12px`.
  - Thẻ hiển thị / Card phân đoạn: `borderRadius: 14 - 16px`.
  - Bottom Sheet & Dialog: `borderRadius: 20 - 24px` kèm thanh kéo chuẩn `<ModalDragIndicator>` ($36\times 5\text{px}$, radius $2.5\text{px}$).

---

## 👆 3. CÔNG THÁI HỌC CẢM ỨNG (TOUCH TARGET $\ge 44\text{pt}$ & VOICEOVER)
- [ ] **Touch Target $\ge 44\text{pt}$**: Mọi nút bấm và icon button có kích thước hiển thị nhỏ ($32 - 36\text{px}$) bắt buộc phải có vùng đệm `hitSlop` từ $8 - 10\text{px}$ để diện tích tiếp xúc ngón tay đạt tối thiểu $\ge 44\times 44\text{pt}$.
- [ ] **Trợ năng VoiceOver**: Bổ sung `accessibilityRole="button"` và nhãn `accessibilityLabel` tiếng Việt rõ nghĩa cho 100% các icon button không có chữ hiển thị.

---

## 🌗 4. VẬT LIỆU MỜ (MATERIALS) & ĐỘ TƯƠNG PHẢN WCAG AAA
- [ ] **Độ tương phản cao AAA**: Màu chữ chính `theme.text.primary` đạt tỷ lệ tương phản $\ge 15.8:1$ trên Light Mode và $20.4:1$ trên Dark Mode (vượt ngưỡng yêu cầu AAA $7.0:1$).
- [ ] **Frosted Glass Translucent**: Header và thanh Dock đáy sử dụng nền bán trong suốt `rgba(255,255,255,0.96)` / `rgba(14,21,36,0.90)` tạo chiều sâu nội dung khi cuộn.
- [ ] **Dual-Theme Tokens**: 100% màu sắc sử dụng hook `useTheme()`, cấm hardcode mã màu Hex trong component.

---

## 🛡️ 5. VÙNG ĐỆM AN TOÀN (SAFE AREA & CUTOUTS)
- [ ] **Đỉnh màn hình (Top Inset & Dynamic Island)**: 100% màn hình sử dụng `<AppHeader>` chuẩn, tự động đệm an toàn `insets.top` để không bị đè bởi Notch hoặc Dynamic Island trên iPhone 14/15/16.
- [ ] **Đáy màn hình (Bottom Gesture Bar)**: Các thanh điều hướng đáy và Dock hành động cố định bắt buộc có `paddingBottom: insets.bottom > 0 ? insets.bottom : 8` để bảo vệ thanh vuốt Home của iOS.

---

## ⚡ 6. PHẢN HỒI XÚC GIÁC & CHUYỂN ĐỘNG LÒ XO (HAPTICS & SPRING MOTION)
- [ ] **Âm thanh 0ms Non-Blocking**: Mọi tương tác chạm phát âm bổng thanh thoát qua `playTapSound()` chạy trên Web Audio API và `expo-audio`.
- [ ] **Phản hồi rung vật lý**: Tích hợp `Haptics.impactAsync(Light)` cho thao tác chọn món, `Medium` cho gửi đơn, `Warning` cho cảnh báo rủi ro.
- [ ] **Lò xo đàn hồi (Fluid Spring)**: Sử dụng `<PressableScale>` với công thức lò xo `Animated.spring` (speed 35, bounciness 4) cho cảm giác nhấn cơ học tự nhiên.

---

## 🗣️ 7. MICROCOPY & LUỒNG 1-CHẠM
- [ ] **Microcopy súc tích**:
  - Nút CTA $\le 3$ chữ (`Tính Tiền`, `Báo Bếp`, `Xong & In Bill`, `Xem Bill`, `Bật Két`).
  - Nhãn tài chính $\le 2$ chữ (`Tiền thừa`, `Đưa đủ`, `Mã QR`).
  - Thông báo Toast $\le 7$ từ (`Đã kích mở két RJ11`, `Đã lưu món "Trà Sữa"`).
- [ ] **Luồng 1-chạm**: Không popup hỏi thừa đối với tác vụ an toàn; tác vụ rủi ro (chiết khấu $> 20\%$, hủy món gửi bếp) sử dụng Action Sheet chọn nhanh lý do lưu Audit Log.
