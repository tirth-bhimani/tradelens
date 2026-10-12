from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Schema for health status response."""

    status: str
    service: str
    version: str


@router.get("/healthz", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def get_health() -> HealthResponse:
    """Return application health status and version."""
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.version,
    )
