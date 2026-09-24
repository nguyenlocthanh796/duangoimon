# 11 — MOBILE CLIENT SECURITY (EXPO SDK 57 / REACT NATIVE)

## 1. Application Configuration & Build Profile

- **Framework**: Expo SDK `57.0.20` / React Native `0.86.3` / React `19.2.3`.
- **App Configuration**: `frontend/app.json`.
  - Package Name Android: `cloud.ongchu.pos` (Version Code 1, Version 1.0.0).
  - Bundle Identifier iOS: `cloud.ongchu.pos` (Build Number 1, Version 1.0.0).
  - Scheme: `ongchu-pos`.
  - New Architecture: `newArchEnabled: true` (React Native New Architecture).
  - Orientation: `default` (Responsive điện thoại / máy tính bảng).
- **Hermes Bytecode Engine**: Được bật mặc định trên Expo 57, biên dịch JavaScript thành Hermes Bytecode (`.hbc`) khi đóng gói production APK/IPA.

---

## 2. Storage & Secret Security on Client

- **AsyncStorage Usage**:
  - Dữ liệu giỏ hàng, active tenant, active branch, store settings, và token đăng nhập (`jwt_token_...`) được lưu trong unencrypted `@react-native-async-storage/async-storage`.
  - Trên thiết bị Android đã root hoặc backup ADB, các file XML của AsyncStorage có thể bị trích xuất dễ dàng.
- **SecureStore Audit**:
  - Thư viện `expo-secure-store` (Android KeyStore / iOS Keychain) **CHƯA ĐƯỢC TÍCH HỢP**.
- **Hardcoded Secrets trong Repository**:
  - `frontend/credentials.json:6`: Chứa mật khẩu phân phối chứng chỉ iOS (`chungchip12`).
  - `frontend/credentials/cert.p12` và `frontend/cert.p12`: File chứng chỉ số iOS được commit trực tiếp vào git repository.

---

## 3. Network Security & SSL Pinning

- **Transport Security**:
  - Sử dụng HTTPS/WSS cho môi trường production (`https://app.ongchu.cloud`).
  - Fallback cho phép HTTP khi chạy local dev (`http://localhost:8080`).
- **SSL Pinning**:
  - **CHƯA ĐƯỢC CẤU HÌNH** (Không có plugin hoặc native module thực hiện SPKI Pinning). Ứng dụng tin tưởng CA của hệ điều hành, có nguy cơ bị can thiệp qua proxy MITM (Burp Suite, Charles) nếu cài đặt chứng chỉ root trên máy test.
- **Biomedical / Screen Security**:
  - Chưa có cờ `FLAG_SECURE` (Android) để chống chụp màn hình hoặc quay lén mã PIN/thông tin tài chính.
