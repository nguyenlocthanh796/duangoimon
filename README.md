<div align="center">
  <img src="frontend/assets/icon.png" width="80" alt="POSA Logo"/>
  <h1 align="center">POSA — POS & Restaurant Management System</h1>
  <p align="center">
    All-in-one F&B management platform
    <br/>
    Point of Sale · Kitchen Display · Inventory · Accounting · CRM · Booking
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

## Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
  - [POS Sales](#pos-sales)
  - [Kitchen Display](#kitchen-display)
  - [Management](#management-modules)
  - [Accounting](#accounting)
  - [Integrations](#integrations)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
  - [Docker Compose (Production)](#docker-compose-production)
  - [Manual Development](#manual-development)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [License](#-license)

---

## 📌 Overview

**POSA** is a comprehensive restaurant chain management platform built for Vietnamese F&B businesses. It replaces fragmented tools (separate POS, inventory, accounting, CRM) with a single integrated system.

**Key differentiators:**
- **F&B-first design** — table management, order rounds, kitchen split, modifier options (size/topping)
- **Multi-branch** — centralized management across locations with per-branch inventory, pricing, and staffing
- **Real-time kitchen** — WebSocket-powered Kanban display with round tracking
- **Offline-capable** — frontend queuing for network interruptions (service worker + local queue)
- **Vietnamese i18n** — full UI/api translation support (vi/en), VND currency formatting

### Target Users

| Role | Access |
|------|--------|
| **Cashier** | POS sales, payments, table management |
| **Kitchen** | Real-time order display, status updates |
| **Manager** | Menu, inventory, staff, reports, CRM |
| **Accountant** | Revenue, invoices (Viettel), P&L |
| **Admin** | Full access, branch management, system config |

---

## 🏗️ Architecture

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
│  │  Auth    │ │  POS     │ │  Management │ Accounting  │ │
│  │  RBAC    │ │  Sales   │ │  Inventory  │  Reports    │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │  Kitchen │ │ Webhook  │ │  i18n · Cache · Sentry   │ │
│  │  WS      │ │ Grab/Momo│ │  Authz · Audit · Rate    │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
           ┌─────────┴──────────┐
           ▼                    ▼
    ┌──────────────┐     ┌───────────┐
    │  PostgreSQL  │     │   Redis   │
    │     (16)     │     │    (7)    │
    └──────────────┘     └───────────┘
```

### Backend Layers (Clean Architecture)

| Layer | Description |
|--------|------------|
| **api/v1/** | Route handlers segmented by domain: `ban_hang`, `quan_ly`, `ke_toan` |
| **core/** | Middleware — auth, RBAC, pagination, i18n, cache, rate limiter, audit, Sentry |
| **models/** | SQLAlchemy ORM — Table, Product, Order, User, Inventory, Recipe, Invoice, etc. |
| **schemas/** | Pydantic v2 request/response validation |
| **integrations/** | 3rd-party — GrabFood/ShopeeFood webhooks, Momo/ZaloPay, Viettel e-invoice |

### Frontend Structure (Expo Router)

| Layer | Description |
|-------|-------------|
| **app/** | File-based routing (`ban-hang/`, `quan-ly/`, `ke-toan/`) |
| **lib/components/** | UI components — POS (OrderScreen, CartPanel, ProductGrid), Payment, Kitchen (Kanban), Management |
| **lib/hooks/** | Custom hooks — `useCart`, `useOrder`, `usePayment`, `useKitchenWS`, `useOfflineSync` |
| **lib/context/** | AuthContext, SidebarContext |
| **lib/api/** | HTTP client with token management + typed endpoints |
| **lib/theme/** | Design tokens — colors (orange primary), typography, shape, spacing |

### Design System

| Token | Value |
|-------|-------|
| Primary | `#F97316` (orange) |
| Background | `#FAFAFA` |
| Cards | White with border/shadow |
| Radius | 16px (2xl) standard |
| Typography | Inter-like, scale-responsive (tablet 1.25x) |
| Formatting | VND currency via `Intl.NumberFormat` |

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Python 3.14** | Runtime |
| **FastAPI** | REST framework with async support |
| **SQLAlchemy 2.x** | Async ORM with PostgreSQL |
| **Alembic** | Database migrations |
| **Pydantic v2** | Request/response validation |
| **PostgreSQL 16** | Primary database |
| **Redis 7** | Caching, session store (optional) |
| **WebSocket** | Real-time kitchen display |
| **structlog** | Structured log pipeline |
| **Sentry** | Error tracking |
| **pytest** | Test runner |

### Frontend

| Technology | Purpose |
|------------|---------|
| **Expo SDK 57** | Cross-platform framework |
| **React Native 0.86** | Mobile UI runtime |
| **Expo Router** | File-based routing |
| **NativeWind** | TailwindCSS-like styling |
| **React Native Reanimated** | Animations |
| **@gorhom/bottom-sheet** | Modifier/payment sheets |
| **TypeScript** | Type safety |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker Compose** | Service orchestration |
| **Nginx** | Reverse proxy + static file serving |
| **PostgreSQL 16** | Database |
| **Healthcheck** | `pg_isready` for boot ordering |

---

## ✅ Features

### POS Sales (`app/ban-hang/`)

| Feature | Description |
|---------|-------------|
| 🛒 Order creation | Select products, configure options (size/topping), add notes |
| 🔄 Order rounds | Sequential ordering per table (round 1, round 2...) |
| 💳 Multi-payment | Cash, bank transfer, card, QR code |
| 🔀 Merge/Split tables | Transfer items between tables |
| 🧾 Receipt printing | Temporary & final invoices |
| 📱 Responsive UI | Tablet-optimized layout with bottom-sheet modals |
| 🪑 Area filtering | Filter tables by zone/section |

### Kitchen Display (`kitchen.tsx`)

| Feature | Description |
|---------|-------------|
| 🔄 Real-time | WebSocket push for new orders |
| 🎯 Kanban board | New → Preparing → Completed columns |
| ⏱️ Round tracking | Visual order grouping by round |
| 🔔 Audio alerts | New order notification |

### Management Modules (`app/quan-ly/`)

| Module | Features |
|--------|----------|
| 📋 Menu | CRUD products, categories, pricing, options |
| 🪑 Tables | Floor plan, zones, QR code mapping |
| 👥 Staff | RBAC roles (admin, cashier, kitchen, manager, accountant) |
| 📦 Inventory | Raw materials, stock in/out, low-stock alerts |
| 🏪 Suppliers | Supplier portal, price lists |
| 📋 Purchase Orders | Create/receive PO, partial receipt tracking |
| 📊 Reports | Revenue, food cost, P&L, top products |
| 👥 CRM | Customer profiles, total spend, visit history |
| 🏆 Membership | Tiered loyalty (points, discount rate, multiplier) |
| 🎯 Marketing | Campaigns (birthday/loyalty/promo), email/SMS |
| 🎟️ Promotions | Buy-X-get-Y, combo deals, time-based discounts |
| 📅 Booking | Reservation management, guest count, status |
| 🏭 Multi-branch | Centralized management across locations |
| 📈 Forecasting | Demand prediction, trend analysis |
| 🔄 Menu Engineering | Boston Matrix (star/plowhorse/puzzle/dog) |
| 🧾 Recipe Mgmt | Recipe costing, wastage tracking |
| 📋 Audit Log | Full mutation history, user/action/entity tracking |

### Accounting (`app/ke-toan/`)

| Feature | Description |
|---------|-------------|
| 📄 E-invoice | Viettel HDDT integration for statutory invoices |
| 💰 Transactions | Income/expense tracking |
| 📑 Financial reports | Revenue aggregation, P&L |

### Integrations

| Partner | Type |
|---------|------|
| 🛵 GrabFood | Webhook order receiving |
| 🛵 ShopeeFood | Webhook order receiving |
| 💳 Momo | Payment gateway |
| 💳 ZaloPay | Payment gateway |
| 🧾 Viettel HDDT | E-invoice generation |

---

## 📁 Project Structure

```
posa/
├── backend/                    # Python FastAPI
│   ├── app/
│   │   ├── api/v1/             # Route handlers
│   │   │   ├── ban_hang/       # POS: orders, payments, products, tables
│   │   │   ├── quan_ly/        # Management: menu, inventory, CRM, reports
│   │   │   └── ke_toan/        # Accounting: invoices, transactions
│   │   ├── core/               # Auth, RBAC, i18n, cache, rate limit, audit
│   │   ├── models/             # SQLAlchemy ORM (Table, Order, Product, User...)
│   │   ├── schemas/            # Pydantic validation
│   │   └── integrations/       # GrabFood, Momo, ZaloPay, Viettel
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
│   │   ├── components/         # Reusable UI (POS, Payment, Kitchen, QuanLy)
│   │   ├── hooks/              # Custom hooks (useCart, useOrder, usePayment...)
│   │   ├── context/            # AuthContext, SidebarContext
│   │   ├── api/                # HTTP client + typed endpoints
│   │   └── theme/              # Design tokens (colors, typography, shape)
│   ├── public/                 # Static web build
│   ├── app.json
│   └── package.json
│
├── infra/                      # Production deployment
│   ├── docker-compose.yml      # PostgreSQL + Backend + Nginx
│   ├── nginx.conf
│   └── backup.sh
│
├── docker-compose.yml          # Development services (DB + Redis + Backend)
├── start.ps1                   # Local dev launcher
└── .env.example                # Environment template
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (for production stack)
- **Python 3.14+** (for backend development)
- **Node.js 22+** (for frontend development)

### Docker Compose (Production)

```bash
cd infra
cp ../backend/.env.example ../backend/.env   # edit environment variables
docker compose up -d
```

| Service | URL |
|---------|-----|
| Web app | http://localhost |
| API docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/healthz |

### Manual Development

**1. Start infrastructure services**

```bash
docker compose up -d postgres redis
```

**2. Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux/macOS
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env
# Edit DATABASE_URL in .env if needed
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Windows note**: Python 3.14+ uses `ProactorEventLoop` by default. The app auto-selects `SelectorEventLoopPolicy` on Windows for psycopg async compatibility (see `app/main.py`).

**3. Frontend**

```bash
cd frontend
npm install
npx expo start --web
```

**4. One-command launcher** (Windows)

```powershell
.\start.ps1
```

Kills existing processes on ports 8000/8081, starts backend with auto-reload, waits for health check, then launches Expo dev server.

### Default Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Cashier | `cashier1` | `cs123` |
| Kitchen | `kitchen1` | `ktch123` |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SECRET_KEY` | JWT signing key (change immediately!) | ✅ |
| `CORS_ORIGINS` | Allowed origins | ✅ |
| `SENTRY_DSN` | Sentry error tracking | Optional |
| `REDIS_URL` | Redis connection string | Optional |

---

## 📐 API Reference

Interactive OpenAPI documentation at `/docs` (Swagger) or `/redoc` (ReDoc) when the server is running.

### Core Endpoints

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | `POST /api/v1/auth/login` | Login, returns JWT |
| Health | `GET /healthz`, `GET /readyz` | Service health checks |
| POS | `GET/POST /api/v1/orders` | Order CRUD |
| POS | `GET /api/v1/tables` | Table listing with status |
| POS | `GET /api/v1/products` | Active products with options |
| Management | `GET/POST /api/v1/quan_ly/*` | Menu, inventory, CRM, reports |
| Accounting | `GET /api/v1/ke_toan/*` | Transactions, invoices |
| WebSocket | `ws://host/ws/kitchen` | Kitchen real-time stream |
| WebSocket | `ws://host/ws/inventory` | Inventory alert stream |

### Example

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

# Get tables (authorized)
curl http://localhost:8000/api/v1/tables \
  -H 'Authorization: Bearer <token>'
```

### Request Flow

```
Client → FastAPI → CORS → Rate Limit → Auth (JWT) → RBAC → Route Handler → 
  Validation (Pydantic) → Audit Log → DB (SQLAlchemy) → Response
```

---

## 🧪 Testing

```bash
cd backend
pytest                           # All tests
pytest tests/test_core.py -v    # Core module tests
pytest --cov=app --cov-report=term --cov-report=html
```

Test coverage: 16/16 passing (core auth, helpers).

---

## 📦 Deployment

### Docker (Production Stack)

```bash
cd infra
# Edit docker-compose.yml with production values
docker compose up -d
```

The production stack includes:
- **PostgreSQL 16** with health check and restart policy
- **FastAPI backend** via uvicorn (Gunicorn for production)
- **Nginx** serving static frontend build + reverse proxy to API

### Security Checklist

> [!WARNING]
> **Required before production:**
> - Change `SECRET_KEY` to a random 64+ character string
> - Change all default passwords (admin, cashier1, kitchen1, database)
> - Set restrictive `CORS_ORIGINS`
> - Configure `DATABASE_URL` with strong credentials
> - Enable HTTPS via Nginx (Let's Encrypt or similar)
> - Review firewall rules (only expose ports 80/443)

---

## 📊 Project Status

| Metric | Value |
|--------|-------|
| Python files | ~95 |
| Frontend components | 50+ |
| Unit tests | 16/16 passing |
| Paginated endpoints | 21 |
| i18n keys | 35 (vi/en) |
| DB migrations | 10+ |
| Docker services | 4 (nginx, backend, postgres, redis) |

---

## 📄 License

MIT © [nguyenlocthanh796](https://github.com/nguyenlocthanh796)
