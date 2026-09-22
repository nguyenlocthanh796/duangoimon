# 🛡️ VÀNH ĐAI 1: QUY TRÌNH ZERO-SOURCE DEPLOYMENT & BẢO VỆ MÃ NGUỒN

Tài liệu hướng dẫn đóng gói và triển khai ứng dụng Backend Golang và Frontend Expo sao cho tuyệt đối không để lộ mã nguồn trên môi trường Production (VPS, Mobile APK/IPA, Web).

---

## 🚫 1. NGUYÊN TẮC BẤT BIẾN

1. **KHÔNG BAO GIỜ** clone repository Git (`.git`) hoặc đặt mã nguồn thô (`.go`, `.ts`, `.tsx`, `.vue`, `.env`) lên máy chủ VPS Production.
2. **KHÔNG BAO GIỜ** cài đặt Go SDK, Node.js, Git hoặc build tool trực tiếp trên VPS Production.
3. **CHỈ TRIỂN KHAI** file nhị phân độc lập đã tước bỏ ký hiệu gỡ lỗi (Stripped Binary) hoặc container image distroless/scratch.

---

## ⚙️ 2. BACKEND GOLANG: STRIPPED BINARY BUILD

### 2.1. Lệnh Biên Dịch Chuẩn Production
Khi build Go binary cho Linux VPS x86_64 / ARM64:

```bash
# Linux x86_64
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -ldflags="-s -w" \
  -trimpath \
  -o bin/server \
  cmd/server/main.go
```

**Giải thích các cờ tối ưu an ninh:**
- `CGO_ENABLED=0`: Tạo file nhị phân tĩnh 100% (Statically linked), không phụ thuộc vào `libc` của OS.
- `-ldflags="-s"`: Strip (tước bỏ) Symbol Table, khiến hacker không thể dùng `nm` hoặc `gdb` để đọc tên hàm/biến nội bộ.
- `-ldflags="-w"`: Strip toàn bộ DWARF Debugging Information, làm giảm dung lượng file 30-40% và chống reverse engineering.
- `-trimpath`: Xóa sạch toàn bộ đường dẫn thư mục gốc trên máy tính lập trình viên (ví dụ `d:/duanpos-ongchu/...`), ngăn lộ cấu trúc thư mục nội bộ.

### 2.2. Multi-Stage Dockerfile Chuẩn Zero-Source
Khi đóng gói bằng Docker, mã nguồn chỉ tồn tại trong giai đoạn `builder` tạm thời và bị xóa hoàn toàn ở image cuối:

```dockerfile
# STAGE 1: Build binary
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -trimpath \
    -o /app/server cmd/server/main.go

# STAGE 2: Distroless Runtime (Chỉ 1 file nhị phân + CA Certs, Zero Source Code, Non-Root)
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=builder /app/server /server
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
```

---

## 📱 3. FRONTEND EXPO & MOBILE: HERMES AOT BYTECODE

### 3.1. Biên Dịch Hermes Bytecode (`.hbc`)
Trên mobile (Android APK/AAB và iOS IPA):
- Bật Hermes JavaScript Engine (`"jsEngine": "hermes"` trong `app.json`).
- Toàn bộ code TypeScript/JavaScript sẽ được biên dịch Ahead-Of-Time (AOT) sang mã nhị phân Bytecode của Hermes (`index.android.bundle` -> `.hbc`).
- Khi hacker giải nén file APK, họ không thể đọc được mã nguồn JavaScript gốc như thông thường.

### 3.2. Web PWA Minification & Obfuscation
- Khi xuất bản Web (`npx expo export --platform web`), bật chế độ Production để Metro Bundler tự động minify (Terser), làm ngắn tên biến và loại bỏ toàn bộ `console.log` / source-map.

---

## 🔑 4. QUẢN LÝ BIẾN MÔI TRƯỜNG & SECRETS

1. File `.env` chứa mật khẩu Database, Secret JWT, VietQR API Key **BẮT BUỘC** nằm trong `.gitignore`.
2. Trên VPS, file `.env` được tạo thủ công hoặc nạp qua Docker Compose Secret, phân quyền chặt:
   ```bash
   chmod 600 /path/to/.env
   chown appuser:appuser /path/to/.env
   ```
3. Định kỳ 90 ngày: Xoay vòng (Rotate) Secret Key JWT và mật khẩu CSDL.
