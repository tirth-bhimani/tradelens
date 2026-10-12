# TradeLens Analytics & Backtesting Service

FastAPI Python microservice providing deterministic trade parsing, FIFO fill pairing, Indian statutory charges computation (STT, GST, Stamp duty), behavioral leak analytics, and rule replay simulations for TradeLens.

## Setup & Running

```bash
# Create virtual environment
python -m venv .venv
# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install package with development dependencies
pip install -e ".[dev]"

# Run development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest
```

## Endpoints
- `GET /healthz` - Health check status
