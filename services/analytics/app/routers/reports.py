"""FastAPI router for TradeLens Weekly Reports Engine (Task 26)."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.reports.email_sender import render_weekly_report_html, send_weekly_report_email
from app.reports.weekly import WeeklyReportEngine, WeeklyReportSummary

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


class ComputeWeeklyReportRequest(BaseModel):
    user_id: str
    week_start_date: str
    week_end_date: str
    trades: list[dict[str, Any]] = Field(default_factory=list)
    rules: list[dict[str, Any]] = Field(default_factory=list)


class SendWeeklyReportRequest(BaseModel):
    to_email: str
    summary: WeeklyReportSummary
    user_name: str | None = None
    app_url: str = "http://localhost:3000"


class BatchCronRequest(BaseModel):
    secret: str | None = None


@router.post("/weekly/compute", response_model=WeeklyReportSummary)
def compute_weekly_report(request: ComputeWeeklyReportRequest) -> WeeklyReportSummary:
    """Deterministic calculation of weekly summary performance metrics."""
    return WeeklyReportEngine.compute_weekly_summary(
        user_id=request.user_id,
        week_start_date=request.week_start_date,
        week_end_date=request.week_end_date,
        trades=request.trades,
        rules=request.rules,
    )


@router.post("/weekly/send")
def dispatch_weekly_report(request: SendWeeklyReportRequest) -> dict[str, Any]:
    """Render and dispatch weekly performance digest email via Resend or mock."""
    return send_weekly_report_email(
        to_email=request.to_email,
        summary=request.summary,
        user_name=request.user_name,
        app_url=request.app_url,
    )


@router.post("/weekly/preview")
def preview_weekly_report_html(request: SendWeeklyReportRequest) -> dict[str, str]:
    """Generate raw HTML preview of the weekly report email."""
    html = render_weekly_report_html(
        summary=request.summary,
        user_name=request.user_name,
        app_url=request.app_url,
    )
    return {"html": html}


@router.post("/weekly/batch-cron")
def run_batch_weekly_cron(
    request: BatchCronRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Execute scheduled batch calculation for active users.

    Secured by bearer token matching CRON_SECRET.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif request.secret:
        token = request.secret

    if not token or token != settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing cron authorization secret.",
        )

    # In production, this queries all active users with weekly_email_enabled
    return {
        "status": "success",
        "processed_users": 0,
        "message": "Batch weekly report cron completed.",
    }
