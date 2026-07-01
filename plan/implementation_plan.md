# Smart Warehouse Inventory & Expiry Optimizer

A production-grade monorepo for small-to-medium retail pharmacies and grocery stores to track stock, predict product expiration risk via sales velocity, and generate mitigation actions using a local RAG pipeline (Ollama + DeepSeek-R1).

## User Review Required

> [!IMPORTANT]
> **PostgreSQL credentials**: The plan uses default dev credentials (`warehouse_user` / `warehouse_pass`). Confirm these are acceptable for your environment, or provide preferred values.

> [!IMPORTANT]
> **Ollama model**: The plan targets `deepseek-r1` via a local Ollama endpoint. Confirm you have (or intend to pull) this model. The docker-compose will expose Ollama on port `11434`.

> [!WARNING]
> **No authentication layer** is included in this plan per the requirements. If you need JWT/session auth on the backend or frontend, let me know and I'll add it.

## Open Questions

1. **Port assignments** — Plan uses `5000` (backend), `8000` (ai-worker), `5173` (frontend dev), `5432` (postgres), `8200` (chromadb). Any conflicts?
2. **Store Policy document** — I'll generate a realistic sample markdown file (`store_policies.md`) for the ChromaDB vector store. Should it cover specific policies (e.g., return windows, discount limits)?
3. **Chart library** — Plan uses **Recharts** for the analytics dashboard. Any preference for a different library (e.g., Chart.js, Nivo)?

---

## Proposed File Tree

```
StockRadar/
├── README.md
├── docker-compose.yml
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js              # Express entry, middleware, route mounting
│       ├── db/
│       │   ├── pool.js           # pg Pool singleton
│       │   └── init.sql          # DDL for all tables
│       ├── routes/
│       │   ├── inventory.js      # POST /api/inventory/batch
│       │   ├── sales.js          # POST /api/sales
│       │   └── analytics.js      # GET /api/analytics/expiry-risk
│       ├── controllers/
│       │   ├── inventoryController.js
│       │   ├── salesController.js
│       │   └── analyticsController.js
│       ├── validators/
│       │   └── schemas.js        # Joi validation schemas
│       └── utils/
│           └── logger.js         # Structured Winston logger
│
├── ai-worker/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/
│   │   └── store_policies.md     # RAG source document
│   └── app/
│       ├── main.py               # FastAPI app + lifespan (ChromaDB init)
│       ├── routers/
│       │   ├── predict.py        # POST /predict-expiry
│       │   └── mitigate.py       # POST /mitigate-risk
│       ├── services/
│       │   ├── velocity.py       # Deterministic sales velocity math
│       │   ├── rag.py            # ChromaDB query + context assembly
│       │   └── llm.py            # Ollama client for DeepSeek-R1
│       ├── models/
│       │   └── schemas.py        # Pydantic request/response models
│       └── utils/
│           └── logger.py         # Python structured logger
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf                # Production static serving
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # Tab router (Intake | Analytics | Mitigation)
│       ├── index.css             # Global design system
│       ├── api/
│       │   └── client.ts         # Axios instance + typed request helpers
│       ├── components/
│       │   ├── Layout.tsx        # Shell: sidebar + header
│       │   ├── IntakeForm.tsx    # Barcode/batch/expiry form with validation
│       │   ├── AnalyticsDashboard.tsx  # Charts + risk table
│       │   ├── MitigationCenter.tsx    # AI-generated drafts + copy
│       │   ├── RiskBadge.tsx     # Colored risk indicator
│       │   └── CopyButton.tsx   # One-click copy utility
│       ├── hooks/
│       │   └── useApi.ts         # Generic fetch/mutation hook
│       └── types/
│           └── index.ts          # Shared TypeScript interfaces
```

---

## Proposed Changes

### 1. Database Layer (PostgreSQL)

#### [NEW] [init.sql](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/src/db/init.sql)

DDL script creating all three tables with proper constraints, indexes, and defaults:

| Table | Key Columns | Notes |
|---|---|---|
| `products` | `id SERIAL PK`, `sku VARCHAR UNIQUE`, `name`, `category`, `created_at` | Index on `sku` |
| `inventory_batches` | `id SERIAL PK`, `product_id FK→products`, `batch_number`, `quantity_received`, `quantity_remaining`, `cost_price NUMERIC(10,2)`, `expiry_date DATE`, `risk_level DEFAULT 'Low'` | Index on `expiry_date`, FK cascade |
| `sales_log` | `id SERIAL PK`, `product_id FK→products`, `quantity_sold`, `sale_price NUMERIC(10,2)`, `sold_at TIMESTAMP DEFAULT NOW()` | Index on `sold_at` |

#### [NEW] [pool.js](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/src/db/pool.js)

pg Pool singleton reading from environment variables with connection error handling.

---

### 2. Backend Orchestrator (`/backend`)

#### [NEW] [index.js](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/src/index.js)

Express server with:
- CORS middleware (allow frontend origin)
- JSON body parsing with 1MB limit
- Request logging via Morgan → Winston
- Health-check endpoint `GET /health`
- Graceful shutdown on SIGTERM

#### [NEW] [inventoryController.js](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/src/controllers/inventoryController.js)

`POST /api/inventory/batch` — Validates payload via Joi, upserts `products` row by SKU, inserts `inventory_batches` row. Returns the created batch with HTTP 201.

#### [NEW] [salesController.js](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/src/controllers/salesController.js)

`POST /api/sales` — Validates payload, decrements `quantity_remaining` on the relevant batch (FIFO by expiry), inserts `sales_log` row. Returns updated inventory state.

#### [NEW] [analyticsController.js](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/src/controllers/analyticsController.js)

`GET /api/analytics/expiry-risk` — Queries active batches (`quantity_remaining > 0`) and last-30-day sales. Forwards aggregated JSON to `ai-worker` at `POST /predict-expiry` via axios. Updates `risk_level` on each batch. Returns enriched risk analysis.

#### [NEW] [schemas.js](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/src/validators/schemas.js)

Joi schemas for batch intake and sales logging with descriptive error messages.

---

### 3. AI Worker (`/ai-worker`)

#### [NEW] [main.py](file:///c:/Users/user/OneDrive/Desktop/StockRadar/ai-worker/app/main.py)

FastAPI app with lifespan handler that:
1. Loads `store_policies.md`, chunks it (~500 chars per chunk)
2. Initializes a persistent ChromaDB collection
3. Embeds and upserts chunks using ChromaDB's default embedding function

#### [NEW] [predict.py](file:///c:/Users/user/OneDrive/Desktop/StockRadar/ai-worker/app/routers/predict.py)

`POST /predict-expiry` — Receives batches + sales, applies the deterministic velocity formula:

```
daily_velocity = total_units_sold_14d / 14
days_until_stockout = quantity_remaining / daily_velocity
if days_until_stockout > days_until_expiry:
    risk_level = "High"
elif days_until_stockout > days_until_expiry * 0.7:
    risk_level = "Medium"
else:
    risk_level = "Low"
```

Returns each batch annotated with `risk_level`, `daily_velocity`, `days_until_stockout`, `days_until_expiry`.

#### [NEW] [mitigate.py](file:///c:/Users/user/OneDrive/Desktop/StockRadar/ai-worker/app/routers/mitigate.py)

`POST /mitigate-risk` — For high-risk batches:
1. Queries ChromaDB for top-3 relevant policy chunks
2. Builds system prompt with policy context
3. Calls Ollama `/api/generate` with `deepseek-r1` model
4. Returns structured markdown (promotional bundle or vendor return email)

#### [NEW] [store_policies.md](file:///c:/Users/user/OneDrive/Desktop/StockRadar/ai-worker/data/store_policies.md)

Realistic sample policy document covering: discount authorization thresholds, vendor return eligibility windows, bundle promotion rules, waste reporting procedures.

---

### 4. Frontend Dashboard (`/frontend`)

Built with Vite + React + TypeScript. Three-tab layout with a dark-themed, glassmorphic design system.

#### [NEW] [index.css](file:///c:/Users/user/OneDrive/Desktop/StockRadar/frontend/src/index.css)

Design system with:
- CSS custom properties for dark theme palette (deep navy → slate gradients)
- Glassmorphism card styles (`backdrop-filter: blur`)
- Smooth transitions and micro-animations
- Google Font: **Inter**
- Responsive breakpoints

#### [NEW] [App.tsx](file:///c:/Users/user/OneDrive/Desktop/StockRadar/frontend/src/App.tsx)

Tab-based router with three views: **Intake Forms**, **Analytics Dashboard**, **Mitigation Center**. Animated tab transitions.

#### [NEW] [IntakeForm.tsx](file:///c:/Users/user/OneDrive/Desktop/StockRadar/frontend/src/components/IntakeForm.tsx)

Form with fields: SKU (barcode), Product Name, Category, Batch Number, Quantity, Cost Price, Expiry Date. Client-side validation (required fields, date must be future, quantity > 0). Submits to `POST /api/inventory/batch`.

#### [NEW] [AnalyticsDashboard.tsx](file:///c:/Users/user/OneDrive/Desktop/StockRadar/frontend/src/components/AnalyticsDashboard.tsx)

- **Inventory Overview chart** (Recharts BarChart — quantity by category)
- **Expiry Decay Trend** (Recharts AreaChart — days-until-expiry distribution)
- **High-Risk Batches Table** — sorted by risk, with colored `RiskBadge` indicators
- Auto-refresh every 60 seconds

#### [NEW] [MitigationCenter.tsx](file:///c:/Users/user/OneDrive/Desktop/StockRadar/frontend/src/components/MitigationCenter.tsx)

- Lists high-risk batches with "Generate Mitigation" button
- Displays AI-generated markdown (promotional bundle or vendor return email)
- **CopyButton** component with clipboard API + success toast animation

---

### 5. Deployment Framework

#### [NEW] [docker-compose.yml](file:///c:/Users/user/OneDrive/Desktop/StockRadar/docker-compose.yml)

Services:
| Service | Image/Build | Ports | Depends On |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432:5432` | — |
| `chromadb` | `chromadb/chroma:latest` | `8200:8000` | — |
| `backend` | Build `./backend` | `5000:5000` | `postgres` |
| `ai-worker` | Build `./ai-worker` | `8000:8000` | `chromadb` |
| `frontend` | Build `./frontend` | `80:80` | `backend` |

Named volumes: `pg_data`, `chroma_data`. Bridge network: `warehouse_net`.

#### [NEW] Backend [Dockerfile](file:///c:/Users/user/OneDrive/Desktop/StockRadar/backend/Dockerfile)

Node 20 Alpine, multi-stage (install → production). Runs `node src/index.js`.

#### [NEW] AI Worker [Dockerfile](file:///c:/Users/user/OneDrive/Desktop/StockRadar/ai-worker/Dockerfile)

Python 3.11 slim, installs from `requirements.txt`. Runs `uvicorn app.main:app`.

#### [NEW] Frontend [Dockerfile](file:///c:/Users/user/OneDrive/Desktop/StockRadar/frontend/Dockerfile)

Multi-stage: Node 20 for `vite build`, then Nginx Alpine for static serving.

#### [NEW] [README.md](file:///c:/Users/user/OneDrive/Desktop/StockRadar/README.md)

Project overview, architecture diagram (Mermaid), quick-start guide, environment variable reference, service endpoints.

---

## Verification Plan

### Automated Tests
```bash
# Build all containers
docker-compose build

# Start stack
docker-compose up -d

# Verify services are healthy
curl http://localhost:5000/health
curl http://localhost:8000/health
```

### Manual Verification
1. **Database**: Connect to PostgreSQL and verify tables are created
2. **Backend**: Use curl/Postman to test all 3 API endpoints
3. **AI Worker**: Send sample batch data to `/predict-expiry` and verify velocity calculations
4. **Frontend**: Open `http://localhost:5173` (dev) or `http://localhost:80` (Docker) and walk through all 3 tabs
5. **End-to-end**: Add inventory → log sale → check analytics → generate mitigation
