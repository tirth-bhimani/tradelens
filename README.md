# TradeLens Monorepo

TradeLens is a behavioral analytics and rule backtesting platform for traders.

## Architecture

- **`apps/web`**: Next.js 14+ (App Router, React, Tailwind CSS, TypeScript) user interface.
- **`services/analytics`**: FastAPI Python microservice performing deterministic FIFO trade pairing, Indian market statutory charges, behavioral leak analytics, and rule replay simulations.
- **`docker-compose.yml`**: Local PostgreSQL 16 database for local development.

## Getting Started

### 1. Prerequisites
- Node.js 18+ / 20+
- Python 3.11+
- Docker & Docker Compose (optional, for local PostgreSQL)

### 2. Frontend Setup
```bash
# Install dependencies from root
npm install

# Start Next.js development server
npm run dev
# App will be accessible at http://localhost:3000
```

### 3. Backend Analytics Setup
```bash
# Navigate to analytics service
cd services/analytics

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install package with dependencies
pip install -e ".[dev]"

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
# API docs accessible at http://localhost:8000/docs
# Health status at http://localhost:8000/healthz
```

### 4. Running Tests
```bash
# Frontend tests
npm test

# Backend tests
pytest services/analytics/tests
```
