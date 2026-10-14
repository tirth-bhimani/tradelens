"""Unit and Integration Tests for General-Purpose Tradebook CSV Parsers."""

from datetime import date
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.models.fills import CustomColumnMapping, RawFillCreate
from app.parsers import (
    UniversalTradeParser,
    CustomCsvParser,
    ZerodhaParser,
    detect_broker,
    parse_tradebook_csv,
)
from app.parsers.normalizer import (
    generate_deterministic_trade_id,
    normalize_symbol,
    normalize_trade_type,
    parse_ist_datetime,
    strip_defensive_quotes,
)

# Standard Zerodha Kite Console export CSV
SAMPLE_ZERODHA_CSV = """symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time
RELIANCE,INE002A01018,2024-03-01,NSE,EQ,EQ,buy,false,10,2450.50,TRD1001,ORD2001,2024-03-01T09:20:15
NIFTY24OCT25000CE,,2024-03-01,NFO,FO,,sell,false,50,145.25,TRD1002,ORD2002,2024-03-01 10:15:30
TCS,INE467B01029,2024-03-01,NSE,EQ,EQ,BUY,false,5,3850.00,TRD1003,ORD2003,2024-03-01T14:45:00
"""

# Groww tradebook CSV format
SAMPLE_GROWW_CSV = """Date,Stock Name,Type,Quantity,Price,Groww Order No
2024-03-04,HDFC Bank,BUY,20,1445.00,GRW1001
2024-03-04,Tata Motors,SELL,50,965.50,GRW1002
"""

# Upstox tradebook CSV format
SAMPLE_UPSTOX_CSV = """Trade Date,Scrip,Side,Traded Qty,Rate,Trade No,Order No
2024-03-05,INFY,BUY,25,1620.00,UPTRD901,UPORD901
2024-03-05,WIPRO,SELL,40,480.00,UPTRD902,UPORD902
"""

# Angel One tradebook CSV format
SAMPLE_ANGEL_CSV = """Trade Date,Symbol,Buy/Sell,Quantity,Trade Price,Trade ID,Order ID
2024-03-06,SBIN,BUY,100,750.25,ANGTRD1,ANGORD1
2024-03-06,ICICIBANK,SELL,30,1085.00,ANGTRD2,ANGORD2
"""

# Generic CSV with arbitrary non-standard column names
SAMPLE_CUSTOM_CSV = """col_date,col_ticker,col_action,col_lots,col_rate,col_ref
2024-03-05,INFY,BUY,25,1620.00,REF1001
2024-03-05,HDFCBANK,SELL,50,1450.50,REF1002
"""


class TestBrokerDetection:
    """Test broker signature and format identification."""

    def test_detects_zerodha_headers(self):
        headers = [
            "symbol",
            "isin",
            "trade_date",
            "exchange",
            "segment",
            "trade_type",
            "quantity",
            "price",
            "trade_id",
            "order_execution_time",
        ]
        assert detect_broker(headers) == "ZERODHA"

    def test_detects_upstox_headers(self):
        headers = ["Trade Date", "Scrip", "Side", "Traded Qty", "Rate", "Trade No"]
        assert detect_broker(headers) == "UPSTOX"

    def test_detects_groww_headers(self):
        headers = ["Date", "Stock Name", "Type", "Quantity", "Price", "Groww Order No"]
        assert detect_broker(headers) == "GROWW"

    def test_detects_angel_one_headers(self):
        headers = ["Trade Date", "Symbol", "Buy/Sell", "Quantity", "Trade Price", "Trade ID"]
        assert detect_broker(headers) == "ANGEL_ONE"

    def test_detects_general_trade_headers(self):
        headers = ["Date", "Instrument", "Action", "Volume", "Avg Price"]
        assert detect_broker(headers) == "GENERAL"

    def test_detects_custom_unrecognized_headers(self):
        headers = ["Col_A", "Col_B", "Col_C", "Col_D"]
        assert detect_broker(headers) == "CUSTOM"

    def test_handles_empty_headers(self):
        assert detect_broker([]) == "CUSTOM"


class TestNormalizer:
    """Test symbol, timestamp, and trade ID normalization."""

    def test_normalize_symbol_removes_prefixes_and_quotes(self):
        assert normalize_symbol("NSE:RELIANCE") == "RELIANCE"
        assert normalize_symbol("BSE:TCS") == "TCS"
        assert normalize_symbol("'NIFTY24OCT25000CE") == "NIFTY24OCT25000CE"
        assert normalize_symbol("  infy  ") == "INFY"

    def test_normalize_trade_type(self):
        assert normalize_trade_type("BUY") == "BUY"
        assert normalize_trade_type("b") == "BUY"
        assert normalize_trade_type("Bought") == "BUY"
        assert normalize_trade_type("SELL") == "SELL"
        assert normalize_trade_type("s") == "SELL"
        assert normalize_trade_type("Sold") == "SELL"

    def test_parse_ist_datetime_iso(self):
        t_date, t_time, is_default = parse_ist_datetime("2024-03-01T09:20:15")
        assert t_date == date(2024, 3, 1)
        assert t_time.hour == 9
        assert t_time.minute == 20
        assert t_time.second == 15
        assert str(t_time.tzinfo) == "Asia/Kolkata"
        assert is_default is False

    def test_parse_ist_datetime_space_separated(self):
        t_date, t_time, is_default = parse_ist_datetime("2024-03-01", "14:30:00")
        assert t_date == date(2024, 3, 1)
        assert t_time.hour == 14
        assert t_time.minute == 30
        assert is_default is False

    def test_parse_ist_datetime_defaults_to_market_open(self):
        t_date, t_time, is_default = parse_ist_datetime("2024-03-01")
        assert t_date == date(2024, 3, 1)
        assert t_time.hour == 9
        assert t_time.minute == 15
        assert t_time.second == 0
        assert is_default is True

    def test_generate_deterministic_trade_id(self):
        t_date = date(2024, 3, 1)
        _, t_time, _ = parse_ist_datetime("2024-03-01T09:15:00")
        tid1 = generate_deterministic_trade_id(
            "TCS", t_date, t_time, "BUY", Decimal("10"), Decimal("3500.00"), 1
        )
        tid2 = generate_deterministic_trade_id(
            "TCS", t_date, t_time, "BUY", Decimal("10"), Decimal("3500.00"), 1
        )
        assert tid1.startswith("GEN_")
        assert tid1 == tid2

    def test_strip_defensive_quotes(self):
        assert strip_defensive_quotes("'12345") == "12345"
        assert strip_defensive_quotes("RELIANCE") == "RELIANCE"
        assert strip_defensive_quotes("") == ""


class TestUniversalTradeParser:
    """Test general-purpose parsing across diverse broker formats."""

    def test_parse_groww_tradebook(self):
        result = parse_tradebook_csv(SAMPLE_GROWW_CSV)
        assert result.broker == "GROWW"
        assert result.imported_rows == 2
        assert result.skipped_rows == 0

        fill1 = result.fills[0]
        assert fill1.symbol == "HDFC BANK"
        assert fill1.trade_type == "BUY"
        assert fill1.quantity == Decimal("20")
        assert fill1.price == Decimal("1445.00")
        assert fill1.order_id == "GRW1001"
        assert fill1.trade_id.startswith("GEN_")

    def test_parse_upstox_tradebook(self):
        result = parse_tradebook_csv(SAMPLE_UPSTOX_CSV)
        assert result.broker == "UPSTOX"
        assert result.imported_rows == 2

        fill1 = result.fills[0]
        assert fill1.symbol == "INFY"
        assert fill1.trade_type == "BUY"
        assert fill1.quantity == Decimal("25")
        assert fill1.price == Decimal("1620.00")
        assert fill1.trade_id == "UPTRD901"
        assert fill1.order_id == "UPORD901"

    def test_parse_angel_one_tradebook(self):
        result = parse_tradebook_csv(SAMPLE_ANGEL_CSV)
        assert result.broker == "ANGEL_ONE"
        assert result.imported_rows == 2

        fill1 = result.fills[0]
        assert fill1.symbol == "SBIN"
        assert fill1.trade_type == "BUY"
        assert fill1.quantity == Decimal("100")
        assert fill1.price == Decimal("750.25")
        assert fill1.trade_id == "ANGTRD1"

    def test_parse_generic_tradebook_with_auto_inference(self):
        generic_csv = (
            "DateTime,Contract,Direction,Shares,Unit Price\n"
            "2024-03-01 10:15:00,RELIANCE,BUY,15,2480.00\n"
            "2024-03-01 11:30:00,TCS,SELL,25,3920.50\n"
        )
        result = parse_tradebook_csv(generic_csv)
        assert result.broker == "GENERAL"
        assert result.imported_rows == 2
        assert result.fills[0].symbol == "RELIANCE"
        assert result.fills[0].quantity == Decimal("15")
        assert result.fills[0].price == Decimal("2480.00")
        assert result.fills[1].symbol == "TCS"
        assert result.fills[1].trade_type == "SELL"

    def test_parse_with_explicit_custom_mapping(self):
        mapping = CustomColumnMapping(
            trade_date="col_date",
            symbol="col_ticker",
            trade_type="col_action",
            quantity="col_lots",
            price="col_rate",
            trade_id="col_ref",
        )
        result = parse_tradebook_csv(SAMPLE_CUSTOM_CSV, custom_mapping=mapping)
        assert result.imported_rows == 2
        assert result.fills[0].symbol == "INFY"
        assert result.fills[0].trade_type == "BUY"
        assert result.fills[0].trade_id == "REF1001"

    def test_universal_corrupt_row_isolation(self):
        corrupt_csv = (
            "Date,Symbol,Type,Qty,Price\n"
            "2024-03-01,INFY,BUY,10,1600.00\n"
            "INVALID_DATE,TCS,BUY,5,3500.00\n"
            "2024-03-01,WIPRO,SELL,-10,450.00\n"
            "2024-03-01,SBIN,SELL,20,750.00\n"
        )
        parser = UniversalTradeParser()
        result = parser.parse(corrupt_csv)
        assert result.total_rows == 4
        assert result.imported_rows == 2
        assert result.skipped_rows == 2
        assert len(result.error_report) == 2


class TestZerodhaParser:
    """Test Zerodha tradebook CSV parsing."""

    def test_parse_valid_zerodha_tradebook(self):
        parser = ZerodhaParser()
        result = parser.parse(SAMPLE_ZERODHA_CSV)

        assert result.broker == "ZERODHA"
        assert result.total_rows == 3
        assert result.imported_rows == 3
        assert result.skipped_rows == 0
        assert len(result.fills) == 3

        fill1 = result.fills[0]
        assert fill1.symbol == "RELIANCE"
        assert fill1.trade_type == "BUY"
        assert fill1.quantity == Decimal("10")
        assert fill1.price == Decimal("2450.50")
        assert fill1.trade_id == "TRD1001"
        assert fill1.order_id == "ORD2001"

        fill2 = result.fills[1]
        assert fill2.symbol == "NIFTY24OCT25000CE"
        assert fill2.trade_type == "SELL"
        assert fill2.quantity == Decimal("50")
        assert fill2.price == Decimal("145.25")

    def test_zerodha_corrupt_row_isolation(self):
        csv_with_error = (
            "symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time\n"
            "TCS,INE467B01029,2024-03-01,NSE,EQ,EQ,buy,false,5,3850.00,TRD101,ORD201,2024-03-01T10:00:00\n"
            "INFY,INE009A01021,INVALID_DATE,NSE,EQ,EQ,buy,false,10,1600.00,TRD102,ORD202,NOT_A_TIME\n"
            "WIPRO,INE075A01022,2024-03-01,NSE,EQ,EQ,sell,false,20,480.00,TRD103,ORD203,2024-03-01T11:00:00\n"
        )
        parser = ZerodhaParser()
        result = parser.parse(csv_with_error)

        assert result.total_rows == 3
        assert result.imported_rows == 2
        assert result.skipped_rows == 1
        assert len(result.error_report) == 1
        assert result.error_report[0]["row_index"] == 2


class TestFastApiParseEndpoint:
    """Test the /api/v1/trades/parse-csv endpoint."""

    def test_parse_csv_endpoint_with_zerodha(self, client: TestClient):
        response = client.post(
            "/api/v1/trades/parse-csv",
            json={"file_name": "tradebook.csv", "content": SAMPLE_ZERODHA_CSV},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["broker"] == "ZERODHA"
        assert data["imported_rows"] == 3
        assert len(data["fills"]) == 3
        assert data["fills"][0]["symbol"] == "RELIANCE"

    def test_parse_csv_endpoint_with_general_csv(self, client: TestClient):
        response = client.post(
            "/api/v1/trades/parse-csv",
            json={"file_name": "groww_trades.csv", "content": SAMPLE_GROWW_CSV},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["broker"] == "GROWW"
        assert data["imported_rows"] == 2
        assert data["fills"][0]["symbol"] == "HDFC BANK"

    def test_parse_csv_endpoint_rejects_non_csv(self, client: TestClient):
        response = client.post(
            "/api/v1/trades/parse-csv",
            json={"file_name": "trades.pdf", "content": "not,a,csv"},
        )
        assert response.status_code == 415
