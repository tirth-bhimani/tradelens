"""Comprehensive Unit Tests for Instrument Normalization Engine (Task 7)."""

from datetime import date
from decimal import Decimal

import pytest
from app.engine.instruments import (
    InstrumentNormalizer,
    get_lot_size,
    normalize_instrument,
)
from app.models.instruments import NormalizedInstrument


class TestCashEquities:
    """Test standard Indian cash equity scrip parsing and normalization."""

    @pytest.mark.parametrize(
        "symbol,expected_underlying",
        [
            ("RELIANCE", "RELIANCE"),
            ("TCS", "TCS"),
            ("INFY", "INFY"),
            ("HDFCBANK", "HDFCBANK"),
            ("M&M", "M&M"),
            ("3MINDIA", "3MINDIA"),
            ("L&TFH", "L&TFH"),
        ],
    )
    def test_clean_equity_symbols(self, symbol: str, expected_underlying: str) -> None:
        inst = InstrumentNormalizer.normalize(symbol)
        assert inst.instrument_type == "EQUITY"
        assert inst.underlying == expected_underlying
        assert inst.normalized_symbol == expected_underlying
        assert inst.option_type is None
        assert inst.strike_price is None
        assert inst.expiry_date is None
        assert inst.lot_size == 1
        assert inst.is_derivative is False
        assert inst.contract_key == f"EQ:{expected_underlying}"
        assert inst.parse_error is None

    @pytest.mark.parametrize(
        "symbol_with_noise,expected_underlying",
        [
            ("NSE:TATAMOTORS", "TATAMOTORS"),
            ("BSE:INFY", "INFY"),
            ("SBIN-EQ", "SBIN"),
            ("TATAMOTORS:EQ", "TATAMOTORS"),
            ("WIPRO-BE", "WIPRO"),
            ("NFO:RELIANCE", "RELIANCE"),
            ("'RELIANCE'", "RELIANCE"),
            ("  INFY  ", "INFY"),
        ],
    )
    def test_equity_with_exchange_prefixes_and_suffixes(
        self, symbol_with_noise: str, expected_underlying: str
    ) -> None:
        inst = InstrumentNormalizer.normalize(symbol_with_noise)
        assert inst.instrument_type == "EQUITY"
        assert inst.underlying == expected_underlying
        assert inst.lot_size == 1
        assert inst.contract_key == f"EQ:{expected_underlying}"
        assert inst.parse_error is None


class TestMonthlyFutures:
    """Test monthly futures contracts across indices and individual stocks."""

    def test_nifty_monthly_future(self) -> None:
        # Oct 2024 last Thursday is Oct 31, 2024
        inst = InstrumentNormalizer.normalize("NIFTY24OCTFUT")
        assert inst.instrument_type == "FUTURE"
        assert inst.underlying == "NIFTY"
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.lot_size == 25
        assert inst.is_derivative is True
        assert inst.option_type is None
        assert inst.strike_price is None
        assert inst.contract_key == "FUT:NIFTY:2024-10-31"
        assert inst.parse_error is None

    def test_banknifty_monthly_future(self) -> None:
        # Nov 2024 last Thursday is Nov 28, 2024
        inst = InstrumentNormalizer.normalize("BANKNIFTY24NOVFUT")
        assert inst.instrument_type == "FUTURE"
        assert inst.underlying == "BANKNIFTY"
        assert inst.expiry_date == date(2024, 11, 28)
        assert inst.lot_size == 15
        assert inst.is_derivative is True
        assert inst.contract_key == "FUT:BANKNIFTY:2024-11-28"

    def test_stock_monthly_future(self) -> None:
        inst = InstrumentNormalizer.normalize("RELIANCE24OCTFUT")
        assert inst.instrument_type == "FUTURE"
        assert inst.underlying == "RELIANCE"
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.lot_size == 1
        assert inst.is_derivative is True
        assert inst.contract_key == "FUT:RELIANCE:2024-10-31"

    def test_sensex_monthly_future_expires_on_friday(self) -> None:
        # Oct 2024 last Friday is Oct 25, 2024
        inst = InstrumentNormalizer.normalize("SENSEX24OCTFUT")
        assert inst.instrument_type == "FUTURE"
        assert inst.underlying == "SENSEX"
        assert inst.expiry_date == date(2024, 10, 25)
        assert inst.lot_size == 10
        assert inst.is_derivative is True
        assert inst.contract_key == "FUT:SENSEX:2024-10-25"


class TestMonthlyOptions:
    """Test monthly European options (CE/PE) contracts."""

    def test_nifty_monthly_call_option(self) -> None:
        inst = InstrumentNormalizer.normalize("NIFTY24OCT25000CE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "NIFTY"
        assert inst.option_type == "CE"
        assert inst.strike_price == Decimal(25000)
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.lot_size == 25
        assert inst.is_derivative is True
        assert inst.contract_key == "OPT:NIFTY:2024-10-31:25000:CE"

    def test_banknifty_monthly_put_option(self) -> None:
        inst = InstrumentNormalizer.normalize("BANKNIFTY24NOV51500PE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "BANKNIFTY"
        assert inst.option_type == "PE"
        assert inst.strike_price == Decimal(51500)
        assert inst.expiry_date == date(2024, 11, 28)
        assert inst.lot_size == 15
        assert inst.is_derivative is True
        assert inst.contract_key == "OPT:BANKNIFTY:2024-11-28:51500:PE"

    def test_stock_option(self) -> None:
        inst = InstrumentNormalizer.normalize("TCS24OCT4000CE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "TCS"
        assert inst.option_type == "CE"
        assert inst.strike_price == Decimal(4000)
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.lot_size == 1
        assert inst.contract_key == "OPT:TCS:2024-10-31:4000:CE"

    def test_decimal_strike_option(self) -> None:
        # Stock options with fractional strikes, e.g. IDEA 12.50
        inst = InstrumentNormalizer.normalize("IDEA24OCT12.50PE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "IDEA"
        assert inst.option_type == "PE"
        assert inst.strike_price == Decimal("12.50")
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.lot_size == 1
        assert inst.contract_key == "OPT:IDEA:2024-10-31:12.50:PE"


class TestWeeklyIndexOptions:
    """Test NSE weekly index options notation (YY-M-DD-STRIKE-CE/PE)."""

    def test_nifty_weekly_october_option(self) -> None:
        # 'O' = October
        inst = InstrumentNormalizer.normalize("NIFTY24O1725000CE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "NIFTY"
        assert inst.option_type == "CE"
        assert inst.strike_price == Decimal(25000)
        assert inst.expiry_date == date(2024, 10, 17)
        assert inst.lot_size == 25
        assert inst.is_derivative is True
        assert inst.contract_key == "OPT:NIFTY:2024-10-17:25000:CE"

    def test_banknifty_weekly_november_option(self) -> None:
        # 'N' = November
        inst = InstrumentNormalizer.normalize("BANKNIFTY24N0651200PE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "BANKNIFTY"
        assert inst.option_type == "PE"
        assert inst.strike_price == Decimal(51200)
        assert inst.expiry_date == date(2024, 11, 6)
        assert inst.lot_size == 15
        assert inst.contract_key == "OPT:BANKNIFTY:2024-11-06:51200:PE"

    def test_finnifty_weekly_december_option(self) -> None:
        # 'D' = December
        inst = InstrumentNormalizer.normalize("FINNIFTY24D2423500PE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "FINNIFTY"
        assert inst.option_type == "PE"
        assert inst.strike_price == Decimal(23500)
        assert inst.expiry_date == date(2024, 12, 24)
        assert inst.lot_size == 25
        assert inst.contract_key == "OPT:FINNIFTY:2024-12-24:23500:PE"

    def test_numeric_month_weekly_option(self) -> None:
        # '9' = September
        inst = InstrumentNormalizer.normalize("NIFTY2490525000CE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "NIFTY"
        assert inst.option_type == "CE"
        assert inst.strike_price == Decimal(25000)
        assert inst.expiry_date == date(2024, 9, 5)
        assert inst.lot_size == 25


class TestBrokerSpaceDelimitedVariations:
    """Test space-delimited, hyphenated, and human-readable broker formats."""

    def test_space_delimited_monthly_option(self) -> None:
        inst = InstrumentNormalizer.normalize("NIFTY 24 OCT 25000 CE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "NIFTY"
        assert inst.option_type == "CE"
        assert inst.strike_price == Decimal(25000)
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.contract_key == "OPT:NIFTY:2024-10-31:25000:CE"

    def test_space_delimited_put_option(self) -> None:
        inst = InstrumentNormalizer.normalize("BANKNIFTY 24 NOV 50000 PE")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "BANKNIFTY"
        assert inst.option_type == "PE"
        assert inst.strike_price == Decimal(50000)
        assert inst.expiry_date == date(2024, 11, 28)
        assert inst.contract_key == "OPT:BANKNIFTY:2024-11-28:50000:PE"

    def test_broker_full_date_option(self) -> None:
        inst = InstrumentNormalizer.normalize("BANKNIFTY 30-OCT-2024 PE 52000")
        assert inst.instrument_type == "OPTION"
        assert inst.underlying == "BANKNIFTY"
        assert inst.option_type == "PE"
        assert inst.strike_price == Decimal(52000)
        assert inst.expiry_date == date(2024, 10, 30)
        assert inst.lot_size == 15
        assert inst.contract_key == "OPT:BANKNIFTY:2024-10-30:52000:PE"

    def test_space_delimited_futures(self) -> None:
        inst = InstrumentNormalizer.normalize("RELIANCE 24 OCT FUT")
        assert inst.instrument_type == "FUTURE"
        assert inst.underlying == "RELIANCE"
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.is_derivative is True
        assert inst.contract_key == "FUT:RELIANCE:2024-10-31"

    def test_full_date_futures(self) -> None:
        inst = InstrumentNormalizer.normalize("NIFTY 31-OCT-2024 FUT")
        assert inst.instrument_type == "FUTURE"
        assert inst.underlying == "NIFTY"
        assert inst.expiry_date == date(2024, 10, 31)
        assert inst.contract_key == "FUT:NIFTY:2024-10-31"


class TestHistoricalLotSizeSchedule:
    """Test date-effective lot size resolution across major index revisions."""

    def test_nifty_historical_lot_sizes(self) -> None:
        # Pre-May 2021: 75
        assert get_lot_size("NIFTY", date(2020, 3, 15)) == 75
        # May 2021 to April 2024: 50
        assert get_lot_size("NIFTY", date(2022, 6, 10)) == 50
        assert get_lot_size("NIFTY", date(2024, 4, 25)) == 50
        # May 2024 onwards: 25
        assert get_lot_size("NIFTY", date(2024, 5, 2)) == 25
        # Default (no date): 25
        assert get_lot_size("NIFTY") == 25

    def test_banknifty_historical_lot_sizes(self) -> None:
        # Pre-July 2023: 25
        assert get_lot_size("BANKNIFTY", date(2022, 1, 10)) == 25
        # July 2023 onwards: 15
        assert get_lot_size("BANKNIFTY", date(2023, 7, 15)) == 15
        assert get_lot_size("BANKNIFTY") == 15

    def test_finnifty_historical_lot_sizes(self) -> None:
        # Pre-May 2024: 40
        assert get_lot_size("FINNIFTY", date(2023, 1, 10)) == 40
        # May 2024 onwards: 25
        assert get_lot_size("FINNIFTY", date(2024, 6, 1)) == 25
        assert get_lot_size("FINNIFTY") == 25

    def test_other_index_lot_sizes(self) -> None:
        assert get_lot_size("SENSEX") == 10
        assert get_lot_size("BANKEX") == 15
        assert get_lot_size("NIFTYNXT50") == 10
        assert get_lot_size("MIDCPNIFTY", date(2024, 6, 1)) == 50
        assert get_lot_size("MIDCPNIFTY", date(2023, 1, 1)) == 75


class TestCurrenciesAndCommodities:
    """Test spot currency and commodity ticker classifications."""

    def test_currencies(self) -> None:
        inst = InstrumentNormalizer.normalize("USDINR")
        assert inst.instrument_type == "CURRENCY"
        assert inst.underlying == "USDINR"
        assert inst.contract_key == "CURR:USDINR:"

        inst2 = InstrumentNormalizer.normalize("CDS:EURINR")
        assert inst2.instrument_type == "CURRENCY"
        assert inst2.underlying == "EURINR"

    def test_commodities(self) -> None:
        inst = InstrumentNormalizer.normalize("MCX:CRUDEOIL")
        assert inst.instrument_type == "COMMODITY"
        assert inst.underlying == "CRUDEOIL"
        assert inst.contract_key == "COMM:CRUDEOIL:"

        inst2 = InstrumentNormalizer.normalize("GOLD")
        assert inst2.instrument_type == "COMMODITY"
        assert inst2.underlying == "GOLD"


class TestGracefulMalformedHandling:
    """Ensure malformed or unparseable symbols never raise unhandled exceptions."""

    def test_empty_and_none_symbol(self) -> None:
        inst1 = InstrumentNormalizer.normalize("")
        assert inst1.instrument_type == "UNKNOWN"
        assert inst1.parse_error is not None
        assert inst1.contract_key == "UNKNOWN:"

        inst2 = InstrumentNormalizer.normalize("   ")
        assert inst2.instrument_type == "UNKNOWN"
        assert inst2.parse_error is not None

    def test_purely_numeric_symbol(self) -> None:
        inst = InstrumentNormalizer.normalize("123456")
        assert inst.instrument_type == "UNKNOWN"
        assert "numeric" in (inst.parse_error or "").lower()

    def test_illegal_characters(self) -> None:
        inst = InstrumentNormalizer.normalize("NIFTY???!!!")
        assert inst.instrument_type == "UNKNOWN"
        assert "invalid" in (inst.parse_error or "").lower()

    def test_invalid_calendar_date_weekly_option(self) -> None:
        # Day 32 does not exist
        inst = InstrumentNormalizer.normalize("NIFTY24O3225000CE")
        assert inst.instrument_type == "UNKNOWN"
        assert "date" in (inst.parse_error or "").lower()

    def test_convenience_function(self) -> None:
        inst = normalize_instrument("RELIANCE")
        assert isinstance(inst, NormalizedInstrument)
        assert inst.instrument_type == "EQUITY"
