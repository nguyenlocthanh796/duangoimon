# 16 — SECRETS & CREDENTIALS AUDIT

*Báo cáo kiểm tra toàn bộ các khóa bảo mật, mật khẩu, và chứng chỉ trong mã nguồn. Giá trị thực tế đã được REDACTED theo quy định an toàn.*

| # | Vị Trí File | Loại Secret / Credential | Trạng Thái | Mức Độ Nghiêm Trọng | Khuyến Nghị Xử Lý |
|---|---|---|---|---|---|
| 1 | `backend/internal/database/database.go:193` | SuperAdmin Password Hardcoded | **FOUND** (`REDACTED`) | **CRITICAL** | Chuyển sang biến môi trường `SUPERADMIN_PASSWORD` hoặc bắt buộc đổi khi boot lần đầu |
| 2 | `backend/internal/handler/auth.go:173` | SuperAdmin Password Check in Login | **FOUND** (`REDACTED`) | **CRITICAL** | Xóa bỏ đoạn bypass so khớp trực tiếp trong code |
| 3 | `backend/internal/handler/auth.go:111` & `order.go:294` | Hardcoded Backup Manager PINs | **FOUND** (`8888`, `9999`) | **CRITICAL** | Xóa bỏ hoàn toàn mã PIN cứng `8888`/`9999` |
| 4 | `backend/internal/config/config.go:34` | Default JWT Secret Fallback | **FOUND** (`REDACTED`) | **HIGH** | Yêu cầu bắt buộc cấu hình trên môi trường Production |
| 5 | `backend/internal/config/config.go:42` | Default SaaS Master Admin Key | **FOUND** (`REDACTED`) | **HIGH** | Yêu cầu bắt buộc cấu hình trên môi trường Production |
| 6 | `backend/internal/config/config.go:46` | Default Webhook Secret Fallback | **FOUND** (`REDACTED`) | **HIGH** | Yêu cầu bắt buộc cấu hình trên môi trường Production |
| 7 | `docker-compose.yml:13` | Default PostgreSQL Password | **FOUND** (`postgres`) | **HIGH** | Đổi mật khẩu mạnh trong `.env` |
| 8 | `frontend/credentials.json:6` | iOS P12 Distribution Certificate Password | **FOUND** (`REDACTED`) | **HIGH** | Xóa khỏi repository, đưa vào GitHub Secrets hoặc vault |
| 9 | `frontend/cert.p12` & `frontend/credentials/cert.p12` | iOS Distribution Certificate Binary | **FOUND** | **HIGH** | Xóa khỏi git tracking, thêm vào `.gitignore` |
