"""TradeLens Weekly Report Email Generator & Dispatcher (Task 26).

Renders a responsive, high-contrast HTML email and delivers via Resend API.
Provides an automated mock/simulation mode when RESEND_API_KEY is not configured
for offline development and isolated test suites.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import settings
from app.reports.weekly import WeeklyReportSummary

logger = logging.getLogger(__name__)


def render_weekly_report_html(
    summary: WeeklyReportSummary,
    user_name: str | None = None,
    app_url: str = "http://localhost:3000",
) -> str:
    """Generate responsive HTML email content for the weekly report."""
    display_name = user_name or "Trader"
    is_profit = summary.net_pnl >= 0
    pnl_color = "#10b981" if is_profit else "#ef4444"
    pnl_sign = "+" if is_profit else ""
    net_pnl_formatted = f"{pnl_sign}₹{summary.net_pnl:,.2f}"
    gross_pnl_formatted = f"₹{summary.gross_pnl:,.2f}"
    charges_formatted = f"₹{summary.total_charges:,.2f}"

    best_day_str = (
        f"{summary.best_day_date} (+₹{summary.best_day_pnl:,.2f})"
        if summary.best_day_date
        else "N/A"
    )
    worst_day_str = (
        f"{summary.worst_day_date} (₹{summary.worst_day_pnl:,.2f})"
        if summary.worst_day_date
        else "N/A"
    )

    leak_banner_html = ""
    if summary.top_behavioral_leak:
        leak_banner_html = f"""
        <div style="margin-top: 20px; background-color: #2a1215; border: 1px solid #7f1d1d; border-radius: 8px; padding: 14px 16px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #f87171; font-weight: 700; margin-bottom: 4px;">
                Top Behavioral Leak Detected
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #fecaca;">
                {summary.top_behavioral_leak}
            </div>
            <div style="font-size: 12px; color: #fca5a5; margin-top: 4px;">
                Estimated drag: -₹{summary.top_leak_loss:,.2f}
            </div>
        </div>
        """

    report_url = f"{app_url}/reports"
    preferences_url = f"{app_url}/settings/notifications"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TradeLens Weekly Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #ffffff;">Trade<span style="color: #10b981;">Lens</span></span>
          </td>
          <td align="right">
            <span style="font-size: 11px; font-family: monospace; color: #94a3b8; background-color: #1e293b; padding: 4px 8px; border-radius: 4px;">
              {summary.week_start_date} → {summary.week_end_date}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Greeting -->
    <div style="margin-bottom: 20px;">
      <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0;">
        Weekly Performance Audit
      </h1>
      <p style="font-size: 14px; color: #94a3b8; margin: 0;">
        Hello {display_name}, here is your verified execution scorecard and behavioral focus for the upcoming week.
      </p>
    </div>

    <!-- Net P&L Hero Card -->
    <div style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 6px;">
        Weekly Net P&L
      </div>
      <div style="font-size: 34px; font-weight: 800; color: {pnl_color}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin-bottom: 12px;">
        {net_pnl_formatted}
      </div>
      <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 10px;">
        Gross: <span style="color: #ffffff; font-weight: 600;">{gross_pnl_formatted}</span> &nbsp;|&nbsp; 
        Statutory Charges & Brokerage: <span style="color: #f87171; font-weight: 600;">-{charges_formatted}</span>
      </div>
    </div>

    <!-- 2x2 Key Stats Grid -->
    <table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin-bottom: 12px;">
      <tr>
        <td width="50%" style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 14px;">
          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Win Rate</div>
          <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 4px;">{summary.win_rate}%</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">{summary.winning_trades}W / {summary.losing_trades}L ({summary.total_trades} trades)</div>
        </td>
        <td width="50%" style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 14px;">
          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Rule Adherence</div>
          <div style="font-size: 18px; font-weight: 700; color: #38bdf8; margin-top: 4px;">{summary.adherence_score}%</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">{summary.rule_violations_count} breaches logged</div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 14px;">
          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Best Day</div>
          <div style="font-size: 13px; font-weight: 600; color: #10b981; margin-top: 4px;">{best_day_str}</div>
        </td>
        <td width="50%" style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 14px;">
          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Worst Day</div>
          <div style="font-size: 13px; font-weight: 600; color: #ef4444; margin-top: 4px;">{worst_day_str}</div>
        </td>
      </tr>
    </table>

    {leak_banner_html}

    <!-- Actionable Focus Item Banner -->
    <div style="background-color: #0f2438; border: 1px solid #0284c7; border-radius: 10px; padding: 18px; margin-top: 20px; margin-bottom: 24px;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">
        ★ Your Actionable Focus For Next Week
      </div>
      <div style="font-size: 14px; line-height: 1.5; color: #e0f2fe; font-weight: 500;">
        {summary.focus_item}
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="{report_url}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px;">
        Open Interactive Report & PDF Export
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #1e293b; padding-top: 18px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;">
        You received this automated report because Weekly Digest is active on your TradeLens account.
      </p>
      <p style="margin: 0;">
        <a href="{preferences_url}" style="color: #94a3b8; text-decoration: underline;">Manage Notification Preferences</a> &nbsp;|&nbsp;
        <a href="{report_url}" style="color: #94a3b8; text-decoration: underline;">TradeLens Journal</a>
      </p>
      <p style="margin-top: 8px; color: #475569; font-size: 10px;">
        Disclaimer: TradeLens is an educational and behavioral journaling software. Past performance is no guarantee of future returns.
      </p>
    </div>

  </div>
</body>
</html>"""


def send_weekly_report_email(
    to_email: str,
    summary: WeeklyReportSummary,
    user_name: str | None = None,
    app_url: str = "http://localhost:3000",
) -> dict[str, Any]:
    """Dispatch the weekly digest email via Resend or return mock payload if unconfigured."""
    html_content = render_weekly_report_html(summary, user_name=user_name, app_url=app_url)
    subject = f"TradeLens Weekly Digest: {summary.week_start_date} → {summary.week_end_date}"

    # If no Resend API key configured, safely simulate delivery
    if not settings.resend_api_key or settings.resend_api_key.strip() in ("", "mock", "placeholder"):
        logger.info(
            f"[WeeklyReportEmail] Simulated dispatch to {to_email} (RESEND_API_KEY unconfigured). "
            f"HTML length: {len(html_content)} bytes."
        )
        return {
            "status": "simulated",
            "provider": "mock",
            "id": f"sim_{uuid4().hex[:12]}",
            "to": to_email,
            "subject": subject,
            "preview_html": html_content,
        }

    # Dispatch to real Resend API
    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            res_json = resp.json()
            return {
                "status": "sent",
                "provider": "resend",
                "id": res_json.get("id"),
                "to": to_email,
            }
    except Exception as exc:
        logger.error(f"[WeeklyReportEmail] Resend delivery failed for {to_email}: {exc}")
        return {
            "status": "failed",
            "error": str(exc),
            "to": to_email,
        }
