# POS F&B — Hệ thống quản lý nhà hàng

[![CI](https://github.com/your-org/posa/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.14-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)

Nền tảng quản lý chuỗi nhà hàng toàn diện: POS bán hàng, quản lý bếp, kho, kế toán, CRM, đặt bàn, tích hợp giao hàng + hóa đơn điện tử.

## 🚀 Quick Start

```bash
# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env   # edit DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (dev)
cd frontend
npx http-server public -p 3000 --proxy http://localhost:8000
```

Or with Docker:

```bash
cd infra
docker compose up -d
```

### Truy cập

| Service | URL |
|---------|-----|
| Web app | http://localhost:80 |
| API docs | http://localhost:8000/docs |
| Admin | http://localhost/admin.html |

### Tài khoản mặc định

| Vai trò | Username  | Password |
|---------|-----------|----------|
| Admin   | admin     | admin123 |
| Thu ngân | cashier1 | cs123    |
| Bếp     | kitchen1  | ktch123  |

## 🏗️ Kiến trúc

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Nginx      │────▶│  FastAPI     │────▶│  PostgreSQL│
│  (static    │     │  (uvicorn)   │     │  (16)      │
│   + proxy)  │     │              │     └───────────┘
└─────────────┘     │  WebSocket   │
                    │  (bếp real-  │
                    │   time)      │
                    └──────────────┘
```

### Backend layers

```
app/
├── api/v1/         # Endpoints (ban_hang, quan_ly, ke_toan)
├── core/           # Auth, pagination, i18n, cache, logging, sentry
├── integrations/   # GrabFood, Momo, Viettel e-invoice
├── models/         # SQLAlchemy models
└── schemas/        # Pydantic schemas
```

## ✅ Tính năng

### 🟢 POS (Bán hàng)
- Tạo đơn hàng, chọn món, tùy chọn món
- Thanh toán: tiền mặt, chuyển khoản, thẻ, QR
- Gộp/tách bàn, chuyển bàn
- In hóa đơn tạm / hóa đơn chính thức

### 🟢 Bếp
- Theo dõi món theo vòng (round)
- Món mới / đang nấu / hoàn thành
- WebSocket real-time cho bếp

### 🟢 Quản lý
- Kho: nhập/xuất nguyên liệu, tồn kho, nhà cung cấp
- Kế toán: doanh thu, báo cáo, hóa đơn điện tử
- CRM: khách hàng, thành viên, tích điểm
- Marketing: chương trình, khuyến mãi, Voucher
- Nhân viên: ca làm việc, quyền RBAC

### 🟢 Kỹ thuật
- **Pagination** — 21 list endpoints dùng `PageParams` + `paginate()`
- **Soft delete** — mixin `SoftDeleteMixin`, migration `deleted_at`
- **i18n** — 35 key, tiếng Việt + English, dùng `app/core/i18n.py`
- **Logging** — JSON structured (structlog)
- **Sentry** — error tracking (tự động nếu có `SENTRY_DSN`)
- **Rate limit** — 5 login attempts/min per IP
- **RBAC** — admin, cashier, kitchen, manager

### 🔵 Tích hợp (API key needed)
- GrabFood / ShopeeFood webhook
- Momo / ZaloPay payment gateway
- Viettel HDDT e-invoice client

## 🧪 Testing

```bash
cd backend
pytest                           # unit + integration
pytest tests/test_core.py -v     # unit tests (16/16)
pytest --cov=app --cov-report=term --cov-report=html
```

## 📦 Deploy

```bash
cd infra
docker compose up -d
```

Cấu hình `.env` với:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key (thay đổi ngay!)
- `CORS_ORIGINS` — allowed origins
- `SENTRY_DSN` — (optional) Sentry error tracking

## 📐 API

OpenAPI docs at `/docs` (swagger) or `/redoc`.

### Example:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

## 📊 Backend Stats

| Metric | Value |
|--------|-------|
| Python files | 95 |
| Unit tests | 16/16 passing |
| List endpoints | 21 (all paginated) |
| i18n keys | 35 (vi/en) |
| Syntax errors | 0 |

## 📄 License

MIT
