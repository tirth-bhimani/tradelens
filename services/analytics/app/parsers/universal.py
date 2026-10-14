"""Universal General-Purpose Trade CSV Parser Implementation."""

from __future__ import annotations

import csv
from decimal import Decimal, InvalidOperation
import io
import re
from typing import Any, Optional
from uuid import UUID

from app.models.fills import CustomColumnMapping, ParseResult, RawFillCreate
from app.parsers.base import BaseParser
from app.parsers.normalizer import (
    generate_deterministic_trade_id,
    normalize_symbol,
    normalize_trade_type,
    parse_ist_datetime,
    strip_defensive_quotes,
)

# Canonical field synonym dictionary for industry-wide tradebook headers
SYNONYM_MAP: dict[str, list[str]] = {
    "symbol": [
        "symbol",
        "scrip",
        "stock",
        "instrument",
        "ticker",
        "contract",
        "tradingsymbol",
        "security",
        "underlying",
        "name",
        "scripsymbol",
        "instrumentname",
        "stockname",
        "securityname",
        "scripname",
        "securitydescription",
        "contractdescription",
        "item",
    ],
    "trade_date": [
        "tradedate",
        "date",
        "orderdate",
        "executiondate",
        "transactiondate",
        "activitydate",
        "dealdate",
        "filldate",
        "transdate",
        "tradingdate",
        "datetime",
        "timestamp",
        "orderdatetime",
    ],
    "fill_time": [
        "orderexecutiontime",
        "executiontime",
        "filltime",
        "tradetime",
        "time",
        "timestamp",
        "ordertime",
        "exectime",
        "executedtime",
        "transactiontime",
        "dealtime",
    ],
    "trade_type": [
        "tradetype",
        "type",
        "action",
        "buysell",
        "side",
        "transactiontype",
        "activity",
        "direction",
        "operation",
        "bs",
        "transtype",
        "ordertype",
    ],
    "quantity": [
        "quantity",
        "qty",
        "tradedqty",
        "tradedquantity",
        "executedqty",
        "executedquantity",
        "volume",
        "shares",
        "lots",
        "size",
        "tradeqty",
        "fillqty",
        "executedshares",
    ],
    "price": [
        "price",
        "rate",
        "tradeprice",
        "avgprice",
        "averageprice",
        "executionprice",
        "executedprice",
        "fillprice",
        "unitprice",
        "orderprice",
        "traderate",
        "netrate",
    ],
    "trade_id": [
        "tradeid",
        "tradeno",
        "tradenumber",
        "ticket",
        "execid",
        "executionid",
        "fillid",
        "dealid",
        "transactionid",
        "refno",
        "referenceno",
        "dealno",
        "tradeidentifier",
    ],
    "order_id": [
        "orderid",
        "orderno",
        "ordernumber",
        "brokerorderid",
        "apporderid",
        "refid",
        "nestorderno",
    ],
}


def clean_header_key(header: str) -> str:
    """Normalize a header string into a clean lowercase alphanumeric key."""
    return re.sub(r"[^a-z0-9]", "", header.lower().strip())


class UniversalTradeParser(BaseParser):
    """General-purpose trade CSV parser with universal column inference and multi-broker support."""

    broker_name: str = "GENERAL"

    def __init__(
        self,
        mapping: Optional[CustomColumnMapping] = None,
        broker_name: Optional[str] = None,
    ) -> None:
        self.mapping = mapping
        if broker_name:
            self.broker_name = broker_name

    def can_parse(self, headers: list[str]) -> bool:
        """Determines if the CSV headers contain sufficient data for a valid trade log."""
        if len(headers) < 4:
            return False
        # Verify if minimum required fields can be inferred
        normalized_headers = {clean_header_key(h): h for h in headers if h}
        has_sym = any(syn in normalized_headers for syn in SYNONYM_MAP["symbol"])
        has_date = any(syn in normalized_headers for syn in SYNONYM_MAP["trade_date"])
        has_type = any(syn in normalized_headers for syn in SYNONYM_MAP["trade_type"])
        has_qty = any(syn in normalized_headers for syn in SYNONYM_MAP["quantity"])
        has_price = any(syn in normalized_headers for syn in SYNONYM_MAP["price"])
        return has_sym and has_date and has_type and (has_qty or has_price)

    def parse(
        self,
        csv_content: str,
        import_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
    ) -> ParseResult:
        """Parse tradebook CSV rows into typed RawFillCreate models."""
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

        # Build clean alphanumeric lookup map: cleaned_key -> original_csv_header
        clean_headers_map = {clean_header_key(f): f for f in reader.fieldnames if f}

        # Resolve or auto-infer column mapping
        mapping = self.mapping or self._infer_mapping(clean_headers_map)
        if not mapping:
            return ParseResult(
                broker=self.broker_name,
                total_rows=0,
                imported_rows=0,
                skipped_rows=0,
                fills=[],
                error_report=[{
                    "error": (
                        "Unable to auto-detect standard trade columns (symbol, date, type, quantity, price). "
                        "Please provide explicit column mappings."
                    )
                }],
            )

        total_rows = 0
        skipped_rows = 0
        fills: list[RawFillCreate] = []
        error_report: list[dict[str, Any]] = []

        for row_idx, row in enumerate(reader, start=1):
            # Skip empty or whitespace-only rows
            if not any(v and v.strip() for v in row.values() if isinstance(v, str)):
                continue

            total_rows += 1

            try:
                # 1. Symbol
                raw_symbol = row.get(mapping.symbol, "")
                if not raw_symbol:
                    raise ValueError(f"Missing symbol in column '{mapping.symbol}'")
                symbol = normalize_symbol(raw_symbol)

                # 2. Date and optional execution time
                raw_date = row.get(mapping.trade_date, "")
                raw_time = row.get(mapping.fill_time, "") if mapping.fill_time else None
                if not raw_date:
                    raise ValueError(f"Missing trade date in column '{mapping.trade_date}'")

                trade_date, fill_time, is_default_time = parse_ist_datetime(raw_date, raw_time)

                # 3. Trade Type (BUY / SELL)
                raw_type = row.get(mapping.trade_type, "")
                if not raw_type:
                    raise ValueError(f"Missing trade type in column '{mapping.trade_type}'")
                trade_type = normalize_trade_type(raw_type)

                # 4. Quantity
                raw_qty = strip_defensive_quotes(row.get(mapping.quantity, ""))
                try:
                    quantity = Decimal(raw_qty)
                    if quantity <= 0:
                        raise ValueError(f"Quantity must be positive, got: {quantity}")
                except (InvalidOperation, TypeError):
                    raise ValueError(f"Invalid numeric quantity: '{raw_qty}'")

                # 5. Price
                raw_price = strip_defensive_quotes(row.get(mapping.price, ""))
                try:
                    price = Decimal(raw_price)
                    if price <= 0:
                        raise ValueError(f"Price must be positive, got: {price}")
                except (InvalidOperation, TypeError):
                    raise ValueError(f"Invalid numeric price: '{raw_price}'")

                # 6. Order ID and Trade ID
                order_id = (
                    strip_defensive_quotes(row.get(mapping.order_id, ""))
                    if mapping.order_id
                    else None
                ) or None

                raw_trade_id = (
                    strip_defensive_quotes(row.get(mapping.trade_id, ""))
                    if mapping.trade_id
                    else None
                )

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

                # 7. Preserve raw row payload for complete auditability
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

    def _infer_mapping(self, clean_headers: dict[str, str]) -> Optional[CustomColumnMapping]:
        """Auto-infer column mappings by matching clean headers against standard synonym lists."""
        def match_synonym(field_key: str) -> Optional[str]:
            for synonym in SYNONYM_MAP.get(field_key, []):
                if synonym in clean_headers:
                    return clean_headers[synonym]
            # Resilient suffix fallback for broker-specific order and trade IDs (e.g. growworderno, upstoxorderno)
            if field_key == "order_id":
                for clean_k, orig_v in clean_headers.items():
                    if clean_k.endswith("orderno") or clean_k.endswith("orderid") or clean_k.endswith("ordernumber"):
                        return orig_v
            if field_key == "trade_id":
                for clean_k, orig_v in clean_headers.items():
                    if clean_k.endswith("tradeno") or clean_k.endswith("tradeid") or clean_k.endswith("tradenumber"):
                        return orig_v
            return None

        symbol_col = match_synonym("symbol")
        date_col = match_synonym("trade_date")
        type_col = match_synonym("trade_type")
        qty_col = match_synonym("quantity")
        price_col = match_synonym("price")

        if symbol_col and date_col and type_col and qty_col and price_col:
            time_col = match_synonym("fill_time")
            # If date and time matched the same column, separate them cleanly
            if time_col == date_col:
                time_col = None

            trade_id_col = match_synonym("trade_id")
            order_id_col = match_synonym("order_id")

            return CustomColumnMapping(
                symbol=symbol_col,
                trade_date=date_col,
                trade_type=type_col,
                quantity=qty_col,
                price=price_col,
                fill_time=time_col,
                trade_id=trade_id_col,
                order_id=order_id_col,
            )
        return None
