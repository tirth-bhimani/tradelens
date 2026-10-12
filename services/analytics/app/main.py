from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health


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
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router)

    return app


app = create_app()
