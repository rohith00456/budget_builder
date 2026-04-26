# 💰 AI-Powered Financial Budget Builder

A production-grade full-stack application for financial budgeting, variance analysis, and AI-driven insights — built for Indian finance teams.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| AI | Groq → Gemini → Anthropic (fallback chain) |
| File Processing | Python Flask + Pandas + openpyxl |
| Cache | Redis |
| Realtime | Socket.io WebSockets |
| Auth | JWT + bcryptjs |
| Charts | Recharts + Chart.js |
| Exports | ExcelJS + PDFKit |

---

## 📋 Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- Redis 7+
- Docker + Docker Compose (optional but recommended)

---

## 🚀 Quick Start (Docker — Recommended)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd financial_budget_builder

# 2. Copy env file and fill in API keys
cp .env.example .env

# 3. Add your AI API keys to .env (see below for where to get them)
# GROQ_API_KEY=...
# GEMINI_API_KEY=...
# ANTHROPIC_API_KEY=...

# 4. Start all services
docker-compose up --build

# 5. Run database migrations (in a new terminal)
docker exec finbudget_backend npx prisma migrate dev --name init

# 6. Seed demo data (optional)
docker exec finbudget_backend npx ts-node prisma/seed.ts
```

Open http://localhost:3000 — login with `admin@demo.com` / `Demo@123456`

---

## 🛠️ Manual Setup (Without Docker)

### Step 1 — Install dependencies

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install

# Python processor
cd ../python_processor
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2 — Setup PostgreSQL

```bash
# Create database
psql -U postgres -c "CREATE DATABASE finbudget;"
```

### Step 3 — Configure environment

Edit `backend/.env`:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/finbudget
REDIS_URL=redis://localhost:6379
JWT_SECRET=any-random-string-at-least-32-chars
GROQ_API_KEY=your-key
GEMINI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
```

### Step 4 — Run database migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npx ts-node prisma/seed.ts  # optional demo data
```

### Step 5 — Start all services

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Python processor
cd python_processor
source venv/bin/activate
python app.py

# Terminal 3 — Frontend
cd frontend
npm run dev
```

---

## 🔑 Getting API Keys

### Groq (Free — Primary AI)
1. Go to https://console.groq.com
2. Sign up for free
3. Navigate to API Keys → Create Key
4. Copy to `GROQ_API_KEY`
5. Free tier: 30 req/min, 6000 tokens/min

### Google Gemini (Free — Secondary AI)
1. Go to https://aistudio.google.com
2. Sign in with Google
3. Click "Get API Key"
4. Copy to `GEMINI_API_KEY`
5. Free tier: 15 req/min

### Anthropic Claude (Paid — Tertiary AI)
1. Go to https://console.anthropic.com
2. Create account and add payment method
3. Go to API Keys → Create Key
4. Copy to `ANTHROPIC_API_KEY`
5. ~$0.003 per 1K tokens (claude-3-5-sonnet)

> **Tip:** You only need ONE AI key to use the app. Groq is free and sufficient for most use cases.

---

## 🗄️ Database Schema

13 models:
- `User` — app users with roles (Admin, Finance Manager, Budget Owner, Viewer)
- `Company` — company profile with fiscal year config
- `BudgetPlan` — annual budget plans with status (Draft → Approved → Locked)
- `BudgetLine` — individual line items with monthly breakdowns (Jan–Dec)
- `Actuals` — imported actual financial data by period
- `Variance` — computed BvA with AI explanations
- `Employee` — headcount roster
- `HeadcountPlan` — planned headcount by department
- `UploadedFile` — file upload tracking
- `AIInsight` — stored AI analysis results
- `Connector` — third-party data source connections
- `Report` — generated board reports
- `KPI` — key performance indicator tracking

---

## 📡 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new company + admin |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/budget` | List all budget plans |
| POST | `/api/budget` | Create budget plan |
| PUT | `/api/budget/:id` | Update budget + lines |
| POST | `/api/budget/:id/approve` | Approve budget |
| POST | `/api/budget/:id/lock` | Lock budget |
| GET | `/api/budget/:id/export` | Download as Excel |
| GET | `/api/actuals` | Get actuals (filterable) |
| POST | `/api/actuals/import` | Bulk import actuals |
| GET | `/api/variance` | Get variances |
| POST | `/api/variance/calculate` | Trigger BvA calculation |
| POST | `/api/ai/analyze-variance` | AI variance analysis |
| POST | `/api/ai/health-check` | AI budget health score |
| POST | `/api/ai/forecast` | AI revenue forecast |
| POST | `/api/ai/chat` | Chat with financial data |
| GET | `/api/headcount` | Employee list |
| POST | `/api/headcount/import` | Bulk import employees |
| POST | `/api/reports/generate` | Generate board report |
| GET | `/api/reports/:id/download` | Download PDF or Excel |
| GET | `/api/connectors` | List connectors |
| POST | `/api/connectors/:type/connect` | Connect a data source |

---

## 📂 Upload File Formats

### Annual Budget (CSV/XLSX)
| Column | Required |
|--------|----------|
| Department | ✅ |
| Category | ✅ |
| Account Code | Optional |
| Jan, Feb, Mar ... Dec | ✅ |
| Annual Total | Optional |
| Type (REVENUE/EXPENSE) | ✅ |

### Monthly Actuals (CSV/XLSX)
| Column | Required |
|--------|----------|
| Period (YYYY-MM) | ✅ |
| Department | ✅ |
| Category | ✅ |
| Amount | ✅ |
| Account Code | Optional |

### Headcount / HR Data (CSV/XLSX)
| Column | Required |
|--------|----------|
| Name | ✅ |
| Title | ✅ |
| Department | ✅ |
| Start Date | ✅ |
| Salary | ✅ |
| Type (FULL_TIME etc) | ✅ |
| Location | Optional |
| Status | Optional |

---

## 🌐 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `upload:started` | Server → Client | File upload began |
| `upload:progress` | Server → Client | Processing step + % |
| `upload:completed` | Server → Client | Processing done with data |
| `upload:failed` | Server → Client | Processing error |
| `job:progress` | Server → Client | General job progress |
| `kpis:refreshed` | Server → Client | KPIs updated |
| `connector:synced` | Server → Client | Connector sync complete |
| `comment:broadcast` | Both | Team comment notification |

---

## 🔧 Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432
# Check DATABASE_URL in .env
```

### "Redis connection failed"
The app works without Redis (caching disabled). Install Redis or use Docker.

### "AI analysis unavailable"
Add at least one AI key to `.env`. Groq is free — start there.

### "Python processor not reachable"
```bash
cd python_processor
python app.py
# Check PYTHON_SERVICE_URL=http://localhost:5001 in backend .env
```

### Prisma migration errors
```bash
cd backend
npx prisma migrate reset  # WARNING: deletes all data
npx prisma migrate dev --name init
```

---

## 📦 Sample CSV Templates

Download sample CSV files from the upload page after starting the app. Click "Download Template" on any file type card.

---

## 🏢 Deployment

### Production environment variables to change:
- `NODE_ENV=production`
- `JWT_SECRET` — use a cryptographically random 64-char string
- `STORAGE_MODE=s3` — configure S3 for file storage
- `DATABASE_URL` — use a managed PostgreSQL (Supabase, RDS, Neon)
- `REDIS_URL` — use a managed Redis (Upstash, ElastiCache)

---

## 📜 License

MIT