# 00 — PROJECT INVENTORY & STACK INTELLIGENCE

## 1. Repository Structure & Root Configuration
* **Monorepo / Multi-Module**: Monorepo chứa 3 phân hệ chính: `/backend` (Golang Engine), `/frontend` (Expo SDK 57 Universal), `/desktop` (Tauri 2.0 Rust wrapper).
* **Package Managers**: 
  - Frontend: `npm` (Lockfile: `package-lock.json` v3, 348KB).
  - Backend: `go modules` (`go.mod`, `go.sum`).
  - Desktop: `cargo` (Rust `Cargo.toml`).
* **Git Configuration**:
  - Root `.gitignore` ignores `node_modules`, `dist`, `.expo`, `.env*.local`, `target/`.
  - Backend `.gitignore` ignores `*.db`, `*.db-*`, `*.exe`, `bin/`.
  - Frontend `.gitignore` ignores `node_modules/`, `.expo/`, `dist/`.
* **CI/CD & Build Scripts**:
  - `START_5_POS_TERMINALS.bat`, `KetNoi_Tablet_POS.bat`, `KhoiChay_MayAo_Pixel.bat`, `KhoiChay_MayAo_Tablet.bat`.
  - GitHub Actions: `.github/workflows` (không có file build tự động CI/CD cứng nào được cấu hình cho static release).

---

## 2. Frontend Technology Stack (`/frontend`)
* **Expo SDK**: `~57.0.20`
* **React Native**: `0.86.3`
* **React / React-DOM**: `19.2.3`
* **Expo Router**: `~57.0.19`
* **Zustand**: `^5.0.15`
* **Shopify FlashList**: `2.0.2`
* **Hermes Engine**: Enabled qua Expo SDK 57 Android/iOS pipeline.
* **Audio Engine**: `expo-audio` (`~57.0.5`)
* **Haptics**: `expo-haptics` (`~57.0.2`)
* **Camera / QR**: `expo-camera` (`~57.0.4`)
* **Local Storage / Persistence**:
  - `@react-native-async-storage/async-storage`: `2.2.0`
  - `SecureStore`: **KHÔNG CÓ** (Không cài đặt `expo-secure-store`).
  - `SQLite`: **KHÔNG CÓ** (Client frontend lưu hoàn toàn trên Zustand + AsyncStorage).
* **Networking & WebSocket**:
  - HTTP: Native `fetch` API (`frontend/lib/api/apiClient.ts`).
  - WebSocket: Native browser/RN `WebSocket` API (`frontend/lib/api/wsClient.ts`).
* **QR & Payment**:
  - `react-native-svg` (`15.15.4`) để render VietQR vector.

---

## 3. Backend Technology Stack (`/backend`)
* **Go Version**: `1.22.6` (định nghĩa tại `backend/go.mod:3`).
* **HTTP Framework**: `github.com/gin-gonic/gin` v1.10.0.
* **CORS**: `github.com/gin-contrib/cors` v1.7.2.
* **ORM Engine**: `gorm.io/gorm` v1.25.11.
* **Database Drivers**:
  - PostgreSQL Driver: `gorm.io/driver/postgres` v1.5.9 (`github.com/jackc/pgx/v5` v5.5.5).
  - SQLite Driver: `github.com/glebarez/sqlite` v1.11.0 (Pure Go CGO-Free SQLite `modernc.org/sqlite` v1.23.1).
* **WebSocket Implementation**: `github.com/gorilla/websocket` v1.5.3.
* **Authentication & Cryptography**:
  - `golang.org/x/crypto/bcrypt` v0.26.0 (Password hashing).
  - `github.com/google/uuid` v1.6.0 (ID generation).
  - JWT Library: **KHÔNG CÓ** (Backend không import `golang-jwt/jwt`; sinh token chuỗi thô `jwt_token_<uid>`).
* **Validation**: `github.com/go-playground/validator/v10` v10.20.0 (tích hợp trong Gin).
* **Logging**: Standard library `log` + Gin logger.
* **Metrics / Tracing**: **KHÔNG CÓ** (Không cấu hình Prometheus, OpenTelemetry hay Jaeger).

---

## 4. Desktop Technology Stack (`/desktop`)
* **Tauri Core**: `2.0.0`
* **Rust Edition**: `2021`
* **Tauri Plugins**: Chỉ dùng core `tauri = "2.0.0"`.
* **Async Runtime**: `tokio = { version = "1.0", features = ["full"] }`.
* **Serialization**: `serde = { version = "1.0", features = ["derive"] }`, `serde_json = "1.0"`.
* **IPC Commands**: `print_receipt`, `open_cash_drawer`.
* **Capabilities & Security**:
  - `withGlobalTauri`: `true` (Expose `window.__TAURI__` vào window context).
  - `security.csp`: `null` (Vô hiệu hóa toàn bộ Content Security Policy).

---

## 5. Infrastructure & Runtime Configuration
* **Docker Compose**: `docker-compose.yml` (PostgreSQL 16 Alpine + Redis 7 Alpine).
* **Reverse Proxy**: Nginx (`nginx_ongchu.conf`, `nginx_conf.txt`).
* **Ports**:
  - Go Backend: `:8080` (HTTP / WebSocket).
  - Expo Web Dev: `:8085`.
  - PostgreSQL: `:5432`.
  - Redis: `:6379`.
  - ESC/POS Thermal Printers: TCP `:9100`.
