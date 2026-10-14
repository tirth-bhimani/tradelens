"""Tests for CSV Formula Injection Defense and FastAPI Upload Endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.security.sanitizer import (
    sanitize_csv_cell,
    sanitize_csv_stream,
)


class TestCsvSanitizer:
    """Test unit behavior of the CWE-1236 formula injection defense."""

    def test_preserves_benign_text(self):
        assert sanitize_csv_cell("RELIANCE") == "RELIANCE"
        assert sanitize_csv_cell("NSE:NIFTY50") == "NSE:NIFTY50"
        assert sanitize_csv_cell("BUY") == "BUY"

    def test_preserves_numeric_negative_and_positive_numbers(self):
        # Valid P&L numbers must not be modified or quoted
        assert sanitize_csv_cell("-150.50") == "-150.50"
        assert sanitize_csv_cell("+2500") == "+2500"
        assert sanitize_csv_cell("0.00") == "0.00"
        assert sanitize_csv_cell("-100") == "-100"

    def test_neutralizes_formula_triggers(self):
        assert sanitize_csv_cell("=1+1") == "'=1+1"
        assert sanitize_csv_cell("=cmd|' /C calc'!A0") == "'=cmd|' /C calc'!A0"
        assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
        assert sanitize_csv_cell("+2+5") == "'+2+5"
        assert sanitize_csv_cell("-2+5") == "'-2+5"
        assert sanitize_csv_cell("\tDDE_LINK") == "'\tDDE_LINK"

    def test_handles_empty_or_none(self):
        assert sanitize_csv_cell("") == ""
        assert sanitize_csv_cell(None) is None

    def test_sanitize_csv_stream_multi_line(self):
        raw_csv = (
            "symbol,price,pnl,command\n"
            "TCS,3500.50,-120.00,=cmd|' /C calc'!A0\n"
            "INFY,1420.00,+50.00,@SUM(B1:B2)\n"
        )
        sanitized, count = sanitize_csv_stream(raw_csv)
        assert count == 2
        assert "'-120.00" not in sanitized
        assert "-120.00" in sanitized
        assert "'+50.00" not in sanitized
        assert "+50.00" in sanitized
        assert "'=cmd|" in sanitized
        assert "'@SUM(" in sanitized


class TestUploadEndpoints:
    """Test FastAPI upload router endpoints."""

    def test_validate_csv_success(self, client: TestClient):
        csv_content = (
            "trade_date,trade_id,symbol,type,quantity,price\n"
            "2026-03-01,1001,TCS,BUY,10,3500\n"
            "2026-03-01,1002,INFY,SELL,5,=cmd|' /C calc'!A0\n"
        )
        response = client.post(
            "/api/v1/trades/validate-csv",
            json={"file_name": "tradebook.csv", "content": csv_content},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["file_name"] == "tradebook.csv"
        assert data["flagged_formulas"] == 1
        assert data["detected_broker"] == "ZERODHA"
        assert data["details"]["sanitized"] is True

    def test_validate_csv_rejects_non_csv(self, client: TestClient):
        response = client.post(
            "/api/v1/trades/validate-csv",
            json={"file_name": "statement.xlsx", "content": "not,a,csv"},
        )
        assert response.status_code == 415
        assert "Only .csv files" in response.json()["detail"]

    def test_upload_stream_success(self, client: TestClient):
        csv_file_bytes = b"symbol,quantity,price\nRELIANCE,10,2450.00\n"
        response = client.post(
            "/api/v1/trades/upload-stream",
            files={"file": ("trades.csv", csv_file_bytes, "text/csv")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["flagged_formulas"] == 0

    def test_upload_stream_rejects_invalid_extension(self, client: TestClient):
        response = client.post(
            "/api/v1/trades/upload-stream",
            files={"file": ("malicious.exe", b"binarycontent", "application/octet-stream")},
        )
        assert response.status_code == 415
