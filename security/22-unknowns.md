# 22 — UNKNOWN AREAS & UNVERIFIABLE ASSUMPTIONS

*Danh sách các vùng dữ liệu / hạ tầng chưa thể xác minh trực tiếp 100% từ mã nguồn trong repository cục bộ mà cần xác minh trên VPS thật hoặc với Chủ Dự Án.*

---

## 1. VPS Host Firewall & Network Rules
- **Trạng thái**: `UNKNOWN` (Không thể chạy `ufw status` hoặc `iptables -L` trực tiếp từ workspace cục bộ).
- **Điểm cần xác minh**:
  - Cổng 5432 (PostgreSQL), 6379 (Redis), và 8080 (Go Engine) có đang bị chặn bởi tường lửa UFW / Cloud Security Group của VPS thật hay không.

---

## 2. Production Environment Secrets Deployment
- **Trạng thái**: `UNKNOWN` (File `.env.production` trên VPS thật không nằm trong git).
- **Điểm cần xác minh**:
  - `SAAS_ADMIN_KEY`, `WEBHOOK_SECRET`, `JWT_SECRET`, và `POSTGRES_PASSWORD` trên VPS thật đã được ghi đè bằng các chuỗi ngẫu nhiên có độ dài cao chưa, hay vẫn đang chạy với giá trị mặc định từ code.

---

## 3. Physical Hardware LAN Subnet
- **Trạng thái**: `INFERENCE` (Dựa trên cấu hình mặc định `192.168.1.200:9100`).
- **Điểm cần xác minh**:
  - Máy in nhiệt và máy POS tại quán thực tế có nằm trong mạng LAN cách ly (VLAN riêng cho POS) hay dùng chung WiFi với khách vãng lai.

---

## 4. Mobile Production App Store Build Signing
- **Trạng thái**: `FACT` (Chứng chỉ `cert.p12` có trong repo).
- **Điểm cần xác minh**:
  - Chứng chỉ số này là chứng chỉ Enterprise In-House hay chứng chỉ Apple Developer cá nhân; chứng chỉ đã từng bị rò rỉ ra ngoài chưa.
