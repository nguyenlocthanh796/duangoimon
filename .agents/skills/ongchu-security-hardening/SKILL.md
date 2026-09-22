---
name: ongchu-security-hardening
description: Quy chuẩn bảo mật 4 vành đai khép kín cho Hệ thống OngChu Lean POS (Chống lộ/mất mã nguồn với Zero-Source Deployment & Stripped Binary, Chống đọc trộm request qua SSL Pinning & HMAC Signature, Đóng băng bảo mật VPS OS & Tường lửa UFW, Chống hack API & Gian lận dòng tiền).
---

# 🛡️ CẨM NANG BẢO MẬT TOÀN DIỆN ONGCHU LEAN POS (SECURITY HARDENING)

Tài liệu hướng dẫn triển khai và duy trì ma trận bảo mật 4 vành đai cho toàn bộ hệ thống POS, đảm bảo bảo vệ tuyệt đối mã nguồn sở hữu trí tuệ, tính toàn vẹn của dữ liệu giao dịch và an toàn hạ tầng máy chủ.

---

## 🧭 KHI NÀO SỬ DỤNG SKILL NÀY

Kích hoạt skill này khi:
1. **Đóng gói & Triển khai Production**: Build binary Golang, build app Expo APK/IPA/Web, cấu hình Dockerfile và phát hành lên VPS.
2. **Cấu hình & Gia cố Hạ Tầng VPS**: Thiết lập SSH bảo mật, tường lửa UFW, Docker network cô lập CSDL, Fail2ban, CrowdSec.
3. **Bảo mật Tầng Truyền Tải & API**: Triển khai HTTPS/TLS 1.3, SSL Pinning trên mobile, cơ chế ký số HMAC-SHA256, chống Replay attack, chống giả mạo request.
4. **Kiểm tra An ninh Ứng dụng**: Rà soát phòng chống SQL Injection, XSS, CSRF, Rate Limiting và kiểm soát phân quyền JWT.
5. **Giám sát & Báo động Xâm nhập**: Cấu hình Audit Log bất biến và Bot Telegram cảnh báo rủi ro an ninh tức thời.

---

## 🏛️ MA TRẬN 4 VÀNH ĐAI BẢO MẬT (4-TIER DEFENSE MATRIX)

| Vành Đai | Trọng Tâm | Công Nghệ & Giải Pháp Thực Chiến |
|---|---|---|
| **V1: Zero-Source Deployment** | Chống mất & lộ mã nguồn | CI/CD build ngoài VPS, Go Stripped Binary (`-s -w -trimpath`), Hermes Bytecode (`.hbc`), Docker Distroless không chứa file code/git. |
| **V2: Anti-MITM & Request Sign** | Chống đọc trộm & can thiệp request | TLS 1.3 Strict, SSL Pinning SPKI SHA-256 trên Mobile, HMAC-SHA256 Request Signing (`X-Signature`), Timestamp/Nonce chống Replay. |
| **V3: VPS & OS Hardening** | Đóng băng hạ tầng máy chủ | SSH Ed25519 (No password, Port riêng), UFW Drop-all, PostgreSQL/Redis cô lập Docker Network (Cấm bind 0.0.0.0), Fail2ban auto-ban. |
| **V4: API Defense & Anti-Fraud** | Chống hack ứng dụng & gian lận | Token Bucket Rate Limiting, GORM Parameterized Queries, JWT Token xoay vòng, Audit Logs append-only + Telegram Alert tức thì. |

---

## 📂 TÀI LIỆU CHI TIẾT & HƯỚNG DẪN THỰC CHIẾN

- [zero-source-deployment.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-security-hardening/references/zero-source-deployment.md): Quy trình build Stripped Binary & Hermes không để lộ mã nguồn.
- [request-signing-mitm.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-security-hardening/references/request-signing-mitm.md): Cơ chế SSL Pinning, ký số HMAC-SHA256 và chống Replay request.
- [vps-os-hardening.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-security-hardening/references/vps-os-hardening.md): Runbook thiết lập VPS Linux, SSH, UFW và mạng Docker cô lập CSDL.
- [offline-hash-chain.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-security-hardening/references/offline-hash-chain.md): Chuỗi Hash chống gian lận xóa đơn khi chạy ngoại tuyến.
- [security-hardening.md](file:///d:/duanpos-ongchu/.agents/rules/security-hardening.md): Quy chuẩn lập trình bảo mật bắt buộc.
