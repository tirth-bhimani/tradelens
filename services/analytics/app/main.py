from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import ai_insights, behavior, health, metrics, reconciliation, rules, upload


def create_app() -> FastAPI:
    """Application factory for TradeLens Analytics Service."""
    app = FastAPI(
        title="TradeLens Analytics Service",
        description="Deterministic P&L, behavioral leak metrics, and rule replay engine",
        version=settings.version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router)
    app.include_router(upload.router)
    app.include_router(reconciliation.router)
    app.include_router(metrics.router)
    app.include_router(behavior.router)
    app.include_router(ai_insights.router)
    app.include_router(rules.router)

    return app


app = create_app()
