"""Zerodha Tradebook CSV Parser Implementation."""

from __future__ import annotations

import csv
from decimal import Decimal, InvalidOperation
import io
from typing import Any, Optional
from uuid import UUID

from app.models.fills import ParseResult, RawFillCreate
from app.parsers.base import BaseParser
from app.parsers.normalizer import (
    generate_deterministic_trade_id,
    normalize_symbol,
    normalize_trade_type,
    parse_ist_datetime,
    strip_defensive_quotes,
)

# Canonical column signatures identifying Zerodha tradebook exports
ZERODHA_REQUIRED_HEADERS = {"trade_date", "symbol", "trade_type", "quantity", "price"}
ZERODHA_MARKER_HEADERS = {"trade_id", "order_execution_time", "order_id", "exchange", "segment", "isin"}


class ZerodhaParser(BaseParser):
    """Parses Zerodha Kite Console tradebook exports into standardized fill models."""

    broker_name: str = "ZERODHA"

    def can_parse(self, headers: list[str]) -> bool:
        """Verify whether the CSV headers match Zerodha's export signature."""
        if not headers:
            return False
        normalized = {h.strip().lower().replace(" ", "_") for h in headers if h}
        base_required = {"trade_date", "symbol", "quantity", "price"}
        has_type = ("trade_type" in normalized) or ("type" in normalized)
        has_required = base_required.issubset(normalized) and has_type
        has_marker = bool(ZERODHA_MARKER_HEADERS.intersection(normalized))
        return has_required and has_marker

    def parse(
        self,
        csv_content: str,
        import_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
    ) -> ParseResult:
        """Parse Zerodha tradebook rows with field normalization and error tracking."""
        if not csv_content or not csv_content.strip():
            return ParseResult(
                broker=self.broker_name,
                total_rows=0,
                imported_rows=0,
                skipped_rows=0,
                fills=[],
                error_report=[],
            )

        reader = csv.DictReader(io.StringIO(csv_content))
        if not reader.fieldnames:
            return ParseResult(
                broker=self.broker_name,
                total_rows=0,
                imported_rows=0,
                skipped_rows=0,
                fills=[],
                error_report=[{"error": "Empty or headerless CSV file."}],
            )

        # Build column index mapping with lowercase keys
        col_map = {f.strip().lower().replace(" ", "_"): f for f in reader.fieldnames if f}

        total_rows = 0
        skipped_rows = 0
        fills: list[RawFillCreate] = []
        error_report: list[dict[str, Any]] = []

        for row_idx, row in enumerate(reader, start=1):
            # Skip empty rows
            if not any(v and v.strip() for v in row.values() if isinstance(v, str)):
                continue

            total_rows += 1

            try:
                # 1. Symbol
                raw_symbol = row.get(col_map.get("symbol", ""), "")
                if not raw_symbol:
                    raise ValueError("Missing symbol")
                symbol = normalize_symbol(raw_symbol)

                # 2. Date and Execution Timestamp
                raw_exec_time = row.get(col_map.get("order_execution_time", ""), "")
                raw_date = row.get(col_map.get("trade_date", ""), "")

                if raw_exec_time and raw_exec_time.strip():
                    trade_date, fill_time, is_default_time = parse_ist_datetime(raw_exec_time)
                elif raw_date and raw_date.strip():
                    trade_date, fill_time, is_default_time = parse_ist_datetime(raw_date)
                else:
                    raise ValueError("Missing trade_date or order_execution_time")

                # 3. Trade Type (buy/sell)
                raw_type = (
                    row.get(col_map.get("trade_type", ""), "")
                    or row.get(col_map.get("type", ""), "")
                )
                if not raw_type:
                    raise ValueError("Missing trade_type")
                trade_type = normalize_trade_type(raw_type)

                # 4. Quantity
                raw_qty = strip_defensive_quotes(row.get(col_map.get("quantity", ""), ""))
                try:
                    quantity = Decimal(raw_qty)
                    if quantity <= 0:
                        raise ValueError(f"Quantity must be positive, got: {quantity}")
                except (InvalidOperation, TypeError):
                    raise ValueError(f"Invalid numeric quantity: {raw_qty}")

                # 5. Price
                raw_price = strip_defensive_quotes(row.get(col_map.get("price", ""), ""))
                try:
                    price = Decimal(raw_price)
                    if price <= 0:
                        raise ValueError(f"Price must be positive, got: {price}")
                except (InvalidOperation, TypeError):
                    raise ValueError(f"Invalid numeric price: {raw_price}")

                # 6. Order ID and Trade ID
                order_id = strip_defensive_quotes(row.get(col_map.get("order_id", ""), "")) or None
                raw_trade_id = strip_defensive_quotes(row.get(col_map.get("trade_id", ""), ""))

                if raw_trade_id:
                    trade_id = raw_trade_id
                else:
                    trade_id = generate_deterministic_trade_id(
                        symbol=symbol,
                        trade_date=trade_date,
                        fill_time=fill_time,
                        trade_type=trade_type,
                        quantity=quantity,
                        price=price,
                        row_index=row_idx,
                    )

                # Retain full raw dictionary with default time flag
                raw_audit = dict(row)
                if is_default_time:
                    raw_audit["_inferred_default_time"] = True

                fill = RawFillCreate(
                    import_id=import_id,
                    user_id=user_id,
                    symbol=symbol,
                    trade_date=trade_date,
                    fill_time=fill_time,
                    trade_type=trade_type,
                    quantity=quantity,
                    price=price,
                    order_id=order_id,
                    trade_id=trade_id,
                    raw_data=raw_audit,
                )
                fills.append(fill)

            except Exception as exc:
                skipped_rows += 1
                error_report.append({
                    "row_index": row_idx,
                    "error": str(exc),
                    "raw_row": row,
                })

        return ParseResult(
            broker=self.broker_name,
            total_rows=total_rows,
            imported_rows=len(fills),
            skipped_rows=skipped_rows,
            fills=fills,
            error_report=error_report,
        )
