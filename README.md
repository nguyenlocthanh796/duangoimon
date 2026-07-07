<div align="center">
  <img src="frontend/assets/icon.png" width="80" alt="POSA Logo"/>
  <h1 align="center">POSA — POS F&B</h1>
  <p align="center">
    Hệ thống quản lý nhà hàng toàn diện
    <br/>
    POS bán hàng · Quản lý bếp · Kho & Kế toán · CRM · Đặt bàn
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/python-3.14-blue?logo=python" alt="Python"/>
    <img src="https://img.shields.io/badge/FastAPI-0.115-teal?logo=fastapi" alt="FastAPI"/>
    <img src="https://img.shields.io/badge/Expo-57-000?logo=expo" alt="Expo"/>
    <img src="https://img.shields.io/badge/React_Native-0.86-61dafb?logo=react" alt="React Native"/>
    <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL"/>
    <img src="https://img.shields.io/badge/Redis-7-dc382d?logo=redis" alt="Redis"/>
    <img src="https://img.shields.io/badge/Docker-compose-2496ed?logo=docker" alt="Docker"/>
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>
  </p>
</div>

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Kiến trúc](#-kiến-trúc)
- [Công nghệ](#-công-nghệ)
- [Tính năng](#-tính-năng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Bắt đầu nhanh](#-bắt-đầu-nhanh)
  - [Docker Compose (khuyến nghị)](#docker-compose-khuyến-nghị)
  - [Thủ công](#thủ-công)
- [API](#-api)
- [Testing](#-testing)
- [Triển khai](#-triển-khai)
- [License](#-license)

---

## 📌 Tổng quan

**POSA** là nền tảng quản lý chuỗi nhà hàng - quán cà phê all-in-one, bao gồm:

- **POS bán hàng** — Tạo đơn, thanh toán đa phương thức, gộp/tách bàn, in hóa đơn
- **Quản lý bếp** — Theo dõi món real-time qua WebSocket
- **Quản lý kho** — Nhập/xuất nguyên liệu, tồn kho, nhà cung cấp
- **Kế toán** — Doanh thu, báo cáo, hóa đơn điện tử
- **CRM** — Khách hàng thân thiết, tích điểm, membership
- **Tích hợp** — GrabFood, ShopeeFood, Momo, ZaloPay, Viettel HDDT

Hỗ trợ đa chi nhánh, đa ca làm việc, phân quyền RBAC (admin, thu ngân, bếp, quản lý).

---

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                        Nginx                            │
│                (static files + reverse proxy)            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI (uvicorn)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  Auth    │ │  POS     │ │  Quản lý  │ │  Kế toán    │ │
│  │  RBAC    │ │  Bán hàng│ │  Kho/CRM  │ │  Báo cáo    │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │  Bếp WS  │ │ Webhook  │ │  i18n · Cache · Sentry   │ │
│  │ real-time │ │ Grab/Momo│ │  Rate Limit · Soft Delete│ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   ┌──────────────┐      ┌───────────┐
   │  PostgreSQL  │      │   Redis   │
   │     (16)     │      │    (7)    │
   └──────────────┘      └───────────┘
```

### Backend (Clean Architecture)

| Layer | Mô tả |
|--------|-------|
| **api/v1/** | Route handlers (ban_hang, quan_ly, ke_toan) |
| **core/** | Auth, pagination, i18n, cache, logging, Sentry |
| **models/** | SQLAlchemy ORM models |
| **schemas/** | Pydantic request/response schemas |
| **integrations/** | GrabFood, Momo, ZaloPay, Viettel HDDT |

### Frontend (Expo Router)

| Layer | Mô tả |
|--------|-------|
| **app/** | File-based routing (Expo Router) |
| **lib/components/** | UI components (POS, Payment, Kitchen, Management) |
| **lib/hooks/** | Custom hooks (useCart, useOrder, usePayment, ...) |
| **lib/context/** | AuthContext, SidebarContext |
| **lib/api/** | API client & endpoint modules |
| **lib/theme/** | Design tokens (colors, typography, shape) |

---

## 🛠️ Công nghệ

### Backend

| Công nghệ | Mục đích |
|-----------|----------|
| **Python 3.14** | Ngôn ngữ |
| **FastAPI** | REST API framework |
| **SQLAlchemy 2.x** | ORM |
| **Alembic** | Migration |
| **Pydantic v2** | Validation |
| **PostgreSQL 16** | Database |
| **Redis 7** | Cache / session |
| **WebSocket** | Bếp real-time |
| **structlog** | Structured logging |
| **Sentry** | Error tracking |
| **pytest** | Testing |

### Frontend

| Công nghệ | Mục đích |
|-----------|----------|
| **Expo SDK 57** | Framework |
| **React Native 0.86** | Mobile UI |
| **Expo Router** | File-based routing |
| **NativeWind** | TailwindCSS styling |
| **React Native Reanimated** | Animations |
| **@gorhom/bottom-sheet** | Bottom sheets |
| **TypeScript** | Type safety |

### Infra

| Công nghệ | Mục đích |
|-----------|----------|
| **Docker Compose** | Orchestration |
| **Nginx** | Reverse proxy + static |
| **PostgreSQL 16** | Database |

---

## ✅ Tính năng

### POS Bán hàng `app/ban-hang/`

| Tính năng | Mô tả |
|-----------|-------|
| 🛒 Tạo đơn hàng | Chọn món, tùy chọn (topping/size), ghi chú |
| 💳 Thanh toán | Tiền mặt, chuyển khoản, thẻ, QR |
| 🔀 Gộp/Tách bàn | Chuyển món giữa các bàn |
| 🧾 In hóa đơn | Tạm tính & hóa đơn chính thức |
| 📱 Mobile POS | Giao diện responsive cho tablet |

### Bếp `app/ban-hang/kitchen`

| Tính năng | Mô tả |
|-----------|-------|
| 🔄 Real-time | WebSocket cập nhật món mới ngay lập tức |
| 🎯 Kanban | Món mới → Đang nấu → Hoàn thành |
| ⏱️ Theo dõi vòng (round) | Quản lý thứ tự món theo từng đợt |

### Quản lý `app/quan-ly/`

| Module | Tính năng |
|--------|-----------|
| 📋 Menu | CRUD món, phân loại, giá, tùy chọn |
| 🪑 Bàn | Quản lý sơ đồ bàn, khu vực |
| 🧑‍💼 Nhân viên | Phân quyền RBAC (admin, cashier, kitchen, manager) |
| 📦 Kho | Nhập/xuất nguyên liệu, tồn kho, nhà cung cấp |
| 📊 Báo cáo | Doanh thu, chi phí, lợi nhuận |
| 👥 CRM | Khách hàng, membership, tích điểm |
| 🎯 Marketing | Khuyến mãi, Voucher, chương trình |
| 📅 Đặt bàn | Quản lý đặt trước, lịch hẹn |
| 🏭 Chi nhánh | Quản lý đa chi nhánh |
| 📈 Dự báo | Phân tích xu hướng, dự báo doanh thu |
| 🔄 Stock | Kiểm kê, cảnh báo tồn kho |

### Kế toán `app/ke-toan/`

| Tính năng | Mô tả |
|-----------|-------|
| 📄 Hóa đơn điện tử | Tích hợp Viettel HDDT |
| 💰 Giao dịch | Theo dõi thu/chi |
| 📑 Báo cáo tài chính | P&L, bảng cân đối |

### Tích hợp

| Đối tác | Loại |
|---------|------|
| 🛵 GrabFood | Webhook nhận đơn |
| 🛵 ShopeeFood | Webhook nhận đơn |
| 💳 Momo | Cổng thanh toán |
| 💳 ZaloPay | Cổng thanh toán |
| 🧾 Viettel HDDT | Hóa đơn điện tử |

---

## 📁 Cấu trúc dự án

```
posa/
├── backend/                    # Python FastAPI
│   ├── app/
│   │   ├── api/v1/             # Route handlers
│   │   │   ├── ban_hang/       # POS endpoints
│   │   │   ├── quan_ly/        # Management endpoints
│   │   │   └── ke_toan/        # Accounting endpoints
│   │   ├── core/               # Auth, i18n, cache, logging
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── integrations/       # 3rd-party integrations
│   ├── alembic/                # Database migrations
│   ├── tests/                  # Unit & integration tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
│
├── frontend/                   # Expo React Native
│   ├── app/                    # Expo Router pages
│   │   ├── ban-hang/           # POS screens
│   │   ├── quan-ly/            # Management screens
│   │   └── ke-toan/            # Accounting screens
│   ├── lib/
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom hooks
│   │   ├── context/            # React contexts
│   │   ├── api/                # API client
│   │   └── theme/              # Design tokens
│   ├── public/                 # Static web build
│   ├── app.json
│   └── package.json
│
├── infra/                      # Docker & nginx
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── backup.sh
│
├── docker-compose.yml          # Dev compose (DB + Redis + Backend)
└── start.ps1                   # Local dev script
```

---

## 🚀 Bắt đầu nhanh

### Yêu cầu

- **Docker & Docker Compose** (cho production stack)
- **Python 3.14+** (cho dev backend)
- **Node.js 22+** (cho dev frontend)

### Docker Compose (khuyến nghị)

Triển khai full stack (PostgreSQL + Backend + Nginx static):

```bash
cd infra
cp ../backend/.env.example ../backend/.env  # chỉnh sửa biến môi trường
docker compose up -d
```

Truy cập:

| Service | URL |
|---------|-----|
| Web app | http://localhost |
| API docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/healthz |

### Thủ công

**1. Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env
# Chỉnh sửa DATABASE_URL trong .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**2. Frontend**

```bash
cd frontend
npm install
npx expo start --web
```

**3. Cơ sở dữ liệu** (nếu chạy backend thủ công)

```bash
docker compose up -d postgres redis
```

### Tài khoản mặc định

| Vai trò | Username | Password |
|---------|----------|----------|
| Admin | `admin` | `admin123` |
| Thu ngân | `cashier1` | `cs123` |
| Bếp | `kitchen1` | `ktch123` |

---

## 📐 API

Tài liệu OpenAPI tự động tại `/docs` (Swagger) hoặc `/redoc` (ReDoc).

### Ví dụ

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

# Danh sách món (phân trang)
curl http://localhost:8000/api/v1/quan_ly/menu?page=1&size=20 \
  -H 'Authorization: Bearer <token>'
```

### Các endpoint chính

| Module | Endpoints | Mô tả |
|--------|-----------|-------|
| Auth | `POST /api/v1/auth/login` | Đăng nhập |
| POS | `GET/POST /api/v1/ban_hang/orders` | Quản lý đơn hàng |
| Kho | `GET/POST /api/v1/quan_ly/stock` | Quản lý tồn kho |
| Kế toán | `GET /api/v1/ke_toan/revenue` | Báo cáo doanh thu |
| WebSocket | `ws://host/ws/kitchen/{branch_id}` | Bếp real-time |

---

## 🧪 Testing

```bash
cd backend
pytest                           # Tất cả tests
pytest tests/test_core.py -v     # Core tests
pytest --cov=app --cov-report=term --cov-report=html
```

---

## 📦 Triển khai

### Docker (production)

```bash
cd infra
vim docker-compose.yml   # chỉnh sửa biến môi trường cho production
docker compose up -d
```

### Biến môi trường quan trọng

| Biến | Mô tả | Bắt buộc |
|------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SECRET_KEY` | JWT signing key (thay đổi ngay!) | ✅ |
| `CORS_ORIGINS` | Allowed origins | ✅ |
| `SENTRY_DSN` | Sentry error tracking | ❌ (tùy chọn) |
| `REDIS_URL` | Redis connection string | ❌ (mặc định local) |

> [!WARNING]
> **Bảo mật:** Thay đổi `SECRET_KEY` và mật khẩu database ngay khi triển khai production. Không sử dụng tài khoản mặc định.

---

## 📊 Hiện trạng

| Metric | Giá trị |
|--------|---------|
| Python files | ~95 |
| Frontend components | ~50+ |
| Unit tests | 16/16 passing |
| List endpoints | 21 (all paginated) |
| i18n keys | 35 (tiếng Việt / English) |
| Database migrations | 10+ |
| Docker services | 4 (nginx, backend, postgres, redis) |

---

## 📄 License

MIT © [nguyenlocthanh796](https://github.com/nguyenlocthanh796)
