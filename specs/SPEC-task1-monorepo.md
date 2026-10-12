# Spec: Task 1 - Monorepo Workspace Initialization & Service Skeletons

## Assumptions
1. **Package Management**: Using standard npm workspaces (`package.json` with `workspaces: ["apps/*"]`) for the JavaScript/TypeScript ecosystem to minimize prerequisite tool installs.
2. **Python Tooling**: Python 3.11+ using standard `pyproject.toml` (compatible with `pip` / `poetry` / `venv`) with FastAPI, Uvicorn, Pydantic v2, and pytest.
3. **Local Infrastructure**: Docker Compose spins up local PostgreSQL 16 on port 5432 with default development credentials matching Supabase conventions.
4. **Operating System**: Development commands must be compatible with Windows PowerShell (pwsh) and standard cross-platform Node/Python tooling.
5. **Port Allocations**: Next.js runs on `http://localhost:3000`, FastAPI analytics service runs on `http://localhost:8000`, PostgreSQL runs on `localhost:5432`.

## Objective
Establish a clean, robust monorepo foundation that houses both the Next.js web application (`apps/web`) and the FastAPI analytics/replay service (`services/analytics`). This foundation provides:
- A unified local developer experience (one root script to run linting, testing, and dev servers).
- Clear architectural separation between user-facing presentation/auth and deterministic computation.
- Fully working skeleton applications with health-check endpoints and baseline unit test harnesses.
- Local containerized PostgreSQL orchestration via Docker Compose for offline development.

## Tech Stack
- **Root Orchestration**: npm workspaces, Docker Compose
- **Frontend (`apps/web`)**:
  - Next.js 14+ (App Router)
  - React 18+
  - TypeScript 5+
  - Tailwind CSS 3+
  - Lucide React (icons)
- **Backend Analytics Engine (`services/analytics`)**:
  - Python 3.11+
  - FastAPI 0.110+
  - Uvicorn 0.28+
  - Pydantic v2.6+
  - pytest 8.0+
  - httpx 0.27+ (for test client)
- **Database / Local Dev**:
  - Docker Compose with PostgreSQL 16 Alpine

## Commands

### Root Commands
```powershell
# Install all node dependencies
npm install

# Start both web and analytics in development mode
npm run dev

# Run all test suites
npm test

# Lint all code
npm run lint

# Build web application
npm run build
```

### Frontend (`apps/web`) Commands
```powershell
# Development server (http://localhost:3000)
npm run dev --prefix apps/web

# Build production bundle
npm run build --prefix apps/web

# Run tests
npm test --prefix apps/web

# Lint
npm run lint --prefix apps/web
```

### Backend (`services/analytics`) Commands
```powershell
# Setup virtual environment (Windows PowerShell)
python -m venv services/analytics/.venv
.\services\analytics\.venv\Scripts\Activate.ps1
pip install -e services/analytics

# Run FastAPI development server with reload (http://localhost:8000)
uvicorn app.main:app --app-dir services/analytics --reload --port 8000

# Run backend unit tests
pytest services/analytics/tests -v

# Run type checking
mypy services/analytics/app
```

### Local Infrastructure Commands
```powershell
# Start local PostgreSQL
docker-compose up -d

# Stop local PostgreSQL
docker-compose down
```

## Project Structure
```
D:\resume\sdd/
├── apps/
│   └── web/                               # Next.js App Router Frontend
│       ├── app/
│       │   ├── layout.tsx                 # Root layout with fonts & providers
│       │   ├── page.tsx                   # Landing / placeholder dashboard page
│       │   └── globals.css                # Tailwind base styles
│       ├── components/                    # Reusable UI components
│       ├── lib/                           # Frontend utilities & helpers
│       ├── public/                        # Static assets & icons
│       ├── package.json                   # Web app dependencies & scripts
│       ├── tsconfig.json                  # TypeScript compiler options
│       ├── tailwind.config.ts             # Tailwind design tokens
│       └── postcss.config.js              # PostCSS config
├── services/
│   └── analytics/                         # Python FastAPI Analytics & Engine
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py                    # FastAPI entrypoint & router mounts
│       │   ├── core/
│       │   │   ├── __init__.py
│       │   │   └── config.py              # Pydantic Settings & env configuration
│       │   ├── routers/
│       │   │   ├── __init__.py
│       │   │   └── health.py              # Healthcheck route (/healthz)
│       │   └── models/
│       │       └── __init__.py
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── conftest.py                # Test fixtures & TestClient setup
│       │   └── test_health.py             # Health check test
│       ├── pyproject.toml                 # Dependencies, metadata & tool configs
│       └── README.md
├── docker-compose.yml                     # Local PostgreSQL & Redis containers
├── .env.example                           # Root environment variable documentation
├── .gitignore                             # Git ignore rules for node, python, env
├── package.json                           # Root workspace definition & unified scripts
└── README.md                              # Monorepo setup guide
```

## Code Style

### TypeScript / Next.js Style
- Explicit return types on server handlers and public utility functions.
- Named exports preferred over default exports for components and utility modules (default export used only for Next.js App Router page/layout files).
- Tailwind utility classes organized logically (layout -> spacing -> typography -> visual -> interactive).

```typescript
// apps/web/lib/utils/format.ts
export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
```

### Python / FastAPI Style
- Type hints on all function signatures and class attributes.
- Pydantic v2 models for all request bodies and response schemas.
- Explicit status codes via `fastapi.status`.

```python
# services/analytics/app/routers/health.py
from fastapi import APIRouter, status
from pydantic import BaseModel

router = APIRouter(tags=["Health"])

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

@router.get("/healthz", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="tradelens-analytics",
        version="0.1.0",
    )
```

## Testing Strategy
- **Frontend**: Vitest / React Testing Library initialized in `apps/web/tests` to verify layout rendering and core utilities.
- **Backend**: `pytest` with `httpx.AsyncClient` or `TestClient` in `services/analytics/tests` to test endpoint responses and settings validation.
- **Continuous Execution**: Both test runners must exit with code 0 in CI and local CLI.

## Boundaries
- **Always do**:
  - Keep Next.js and FastAPI cleanly decoupled; communicate via standard HTTP REST contracts.
  - Pin dependency major versions in `package.json` and `pyproject.toml`.
  - Maintain `.env.example` when adding any new environment variables.
- **Ask first**:
  - Adding heavy monorepo build orchestrators (e.g. Turborepo, Nx).
  - Changing the port allocations (3000, 8000, 5432).
  - Adding additional external service dependencies to `docker-compose.yml`.
- **Never do**:
  - Commit `.env`, `.venv/`, `node_modules/`, or build artifacts (`.next/`, `__pycache__/`) to git.
  - Place analytical P&L computation logic inside the frontend Next.js application.
  - Bypass TypeScript strict mode or disable Python type checks.

## Success Criteria
- [ ] Running `npm run build --prefix apps/web` succeeds with 0 TypeScript and 0 lint errors.
- [ ] Running `pytest services/analytics/tests/test_health.py` passes with green status.
- [ ] Starting the FastAPI server and querying `GET http://localhost:8000/healthz` returns HTTP 200 with `{"status": "ok", "service": "tradelens-analytics", "version": "0.1.0"}`.
- [ ] Root `package.json` contains unified commands (`dev`, `build`, `test`, `lint`) orchestrating both projects.
- [ ] `docker-compose.yml` successfully boots a local PostgreSQL 16 container that accepts connections on `localhost:5432`.
- [ ] `.gitignore` covers Node.js, Python, Next.js, and virtual environment artifacts.

## Open Questions
1. Do you prefer `pnpm` or standard `npm` as the primary package manager for the frontend?
2. Should `docker-compose.yml` also include a containerized Supabase local stack (via Supabase CLI), or is a clean PostgreSQL 16 database sufficient for Phase 1?
