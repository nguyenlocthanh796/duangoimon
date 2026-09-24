# 15 — DEPENDENCY & SUPPLY CHAIN SECURITY

## 1. Backend Dependencies (`go.mod`)

- **Go Version**: `1.22.6`.
- **Direct Dependencies**:
  - `github.com/gin-gonic/gin` `v1.10.0`
  - `github.com/gin-contrib/cors` `v1.7.2`
  - `github.com/glebarez/sqlite` `v1.11.0`
  - `github.com/google/uuid` `v1.6.0`
  - `github.com/gorilla/websocket` `v1.5.3`
  - `golang.org/x/crypto` `v0.26.0`
  - `gorm.io/driver/postgres` `v1.5.9`
  - `gorm.io/gorm` `v1.25.11`
- **Supply Chain Status**:
  - Tất cả các thư viện Go đều là bản cập nhật ổn định, không có CVE nghiêm trọng đã công bố tại thời điểm kiểm tra.
  - Mã nguồn sử dụng Pure Go SQLite (`modernc.org/sqlite` v1.23.1) tránh hoàn toàn sự phụ thuộc vào CGO và compiler C trên máy đích.

---

## 2. Frontend Dependencies (`package.json`)

- **Direct Dependencies**:
  - `expo`: `~57.0.20`
  - `react`: `19.2.3`
  - `react-native`: `0.86.3`
  - `expo-router`: `~57.0.19`
  - `zustand`: `^5.0.15`
  - `@shopify/flash-list`: `2.0.2`
  - `@react-native-async-storage/async-storage`: `2.2.0`
  - `expo-audio`: `~57.0.5`
  - `expo-camera`: `~57.0.4`
  - `expo-haptics`: `~57.0.2`
  - `react-native-svg`: `15.15.4`
- **Supply Chain Status**:
  - Thư viện Frontend nằm trong hệ sinh thái Expo SDK 57 chính thức.
  - Không có thư viện lạ hoặc không rõ nguồn gốc.

---

## 3. Desktop Dependencies (`Cargo.toml`)

- **Dependencies**:
  - `tauri`: `2.0.0`
  - `serde`: `1.0`
  - `serde_json`: `1.0`
  - `tokio`: `1.0`
- **Supply Chain Status**:
  - Tối giản tối đa (theo nguyên lý Ponytail: Không cài plugin dư thừa, chỉ dùng stdlib Rust và socket TCP tích hợp).
