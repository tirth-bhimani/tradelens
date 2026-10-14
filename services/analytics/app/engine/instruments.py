"""TradeLens Instrument Normalization Engine.

Deterministic parser and classifier for Indian equity, futures, options,
commodities, and currency ticker symbols across Indian exchanges (NSE, BSE, MCX).
"""

from __future__ import annotations

import calendar
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from app.models.instruments import NormalizedInstrument

# Month mapping for 3-letter codes
MONTH_NAME_TO_INT: dict[str, int] = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}
INT_TO_MONTH_NAME: dict[int, str] = {v: k for k, v in MONTH_NAME_TO_INT.items()}

# NSE single-character weekly month mapping
# 1-9 for Jan-Sep, O for Oct, N for Nov, D for Dec
WEEKLY_MONTH_MAP: dict[str, int] = {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "O": 10,
    "N": 11,
    "D": 12,
}
INT_TO_WEEKLY_MONTH: dict[int, str] = {
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "O",
    11: "N",
    12: "D",
}

# Known currency tickers
CURRENCY_SYMBOLS: frozenset[str] = frozenset({"USDINR", "EURINR", "GBPINR", "JPYINR"})

# Known MCX commodity roots
COMMODITY_SYMBOLS: frozenset[str] = frozenset({
    "CRUDEOIL",
    "CRUDEOILM",
    "NATURALGAS",
    "NATGASMINI",
    "GOLD",
    "GOLDM",
    "GOLDPETAL",
    "SILVER",
    "SILVERM",
    "SILVERMIC",
    "COPPER",
    "ZINC",
    "ZINCMINI",
    "ALUMINIUM",
    "ALUMINI",
    "LEAD",
    "LEADMINI",
    "NICKEL",
    "COTTON",
})

# Exchange prefixes to clean
EXCHANGE_PREFIXES: tuple[str, ...] = (
    "NSE:",
    "BSE:",
    "NFO:",
    "BFO:",
    "MCX:",
    "CDS:",
    "NCDEX:",
)

# Common Indian series suffixes to clean from equity symbols
EQUITY_SUFFIXES: tuple[str, ...] = (
    "-EQ",
    ":EQ",
    "-BE",
    ":BE",
    "-SM",
    ":SM",
    "-BL",
    ":BL",
    "-IL",
    ":IL",
    "-BZ",
    ":BZ",
)

# Regex patterns
# 1. Compact Monthly Futures: e.g. NIFTY24OCTFUT, RELIANCE24OCTFUT
RE_MONTHLY_FUT = re.compile(r"^([A-Z0-9&]+?)(\d{2})([A-Z]{3})FUT$")

# 2. Compact Weekly Options: e.g. NIFTY24O1725000CE, BANKNIFTY24N0651200PE
RE_WEEKLY_OPT = re.compile(r"^([A-Z0-9&]+?)(\d{2})([1-9OND])(\d{2})(\d+(?:\.\d+)?)(CE|PE)$")

# 3. Compact Monthly Options: e.g. NIFTY24OCT25000CE, IDEA24OCT12.50PE
RE_MONTHLY_OPT = re.compile(r"^([A-Z0-9&]+?)(\d{2})([A-Z]{3})(\d+(?:\.\d+)?)(CE|PE)$")

# 4. Delimited Futures: e.g. NIFTY 24 OCT FUT, NIFTY 31-OCT-2024 FUT, RELIANCE 24 OCT FUT
RE_DELIMITED_FUT_FULL_DATE = re.compile(
    r"^([A-Z0-9&]+)\s+(\d{1,2})[-/\s]([A-Z]{3})[-/\s](\d{2,4})\s+FUT$"
)
RE_DELIMITED_FUT_MONTH_YEAR = re.compile(
    r"^([A-Z0-9&]+)\s+(\d{2})[-/\s]?([A-Z]{3})\s+FUT$"
)

# 5. Delimited Options: e.g.
#    NIFTY 24 OCT 25000 CE
#    BANKNIFTY 30-OCT-2024 PE 52000
#    BANKNIFTY 30-OCT-2024 52000 PE
#    NIFTY 17-OCT-24 25000 CE
RE_DELIMITED_OPT_FULL_DATE = re.compile(
    r"^([A-Z0-9&]+)\s+(\d{1,2})[-/\s]([A-Z]{3})[-/\s](\d{2,4})\s+(?:(CE|PE)\s+(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s+(CE|PE))$"
)
RE_DELIMITED_OPT_MONTH_YEAR = re.compile(
    r"^([A-Z0-9&]+)\s+(\d{2})[-/\s]?([A-Z]{3})\s+(?:(CE|PE)\s+(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s+(CE|PE))$"
)


def get_last_weekday_of_month(year: int, month: int, target_weekday: int = 3) -> date:
    """Return the date of the last occurrence of target_weekday in the given month.

    target_weekday: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday.
    Default 3 is Thursday (NSE standard monthly derivative expiry).
    """
    _, num_days = calendar.monthrange(year, month)
    for day in range(num_days, 0, -1):
        d = date(year, month, day)
        if d.weekday() == target_weekday:
            return d
    raise ValueError(f"Could not find target weekday {target_weekday} in {year}-{month}")


def get_lot_size(underlying: str, trade_date: date | None = None) -> int:
    """Return the date-effective market lot size for an Indian instrument.

    Incorporates exchange circular revisions for NIFTY, BANKNIFTY, FINNIFTY,
    MIDCPNIFTY, and SENSEX. Default for equities and unrecognized instruments is 1.
    """
    root = underlying.upper().strip()

    if root == "NIFTY":
        # NIFTY lot size history:
        # Before 2021-05-01: 75
        # 2021-05-01 to 2024-04-30: 50
        # 2024-05-01 onwards: 25
        if trade_date is None or trade_date >= date(2024, 5, 1):
            return 25
        if trade_date >= date(2021, 5, 1):
            return 50
        return 75

    if root == "BANKNIFTY":
        # BANKNIFTY lot size history:
        # Before 2023-07-01: 25
        # 2023-07-01 onwards: 15
        if trade_date is None or trade_date >= date(2023, 7, 1):
            return 15
        return 25

    if root == "FINNIFTY":
        # FINNIFTY lot size history:
        # Before 2024-05-01: 40
        # 2024-05-01 onwards: 25
        if trade_date is None or trade_date >= date(2024, 5, 1):
            return 25
        return 40

    if root == "MIDCPNIFTY":
        # MIDCPNIFTY lot size history:
        # Before 2024-05-01: 75
        # 2024-05-01 onwards: 50
        if trade_date is None or trade_date >= date(2024, 5, 1):
            return 50
        return 75

    if root in ("SENSEX", "NIFTYNXT50"):
        return 10

    if root == "BANKEX":
        return 15

    # Standard default for equities and single-stock derivatives
    return 1


class InstrumentNormalizer:
    """Deterministic parser and classifier for Indian equity and derivative tickers."""

    @classmethod
    def clean_symbol(cls, raw_symbol: str) -> str:
        """Strip defensive quotes, whitespace, exchange prefixes, and equity suffixes."""
        if not raw_symbol:
            return ""

        # Remove leading/trailing quotes and whitespace
        s = raw_symbol.strip("'\" \t\r\n").upper()

        # Remove exchange prefix if present
        for prefix in EXCHANGE_PREFIXES:
            if s.startswith(prefix):
                s = s[len(prefix) :].strip()
                break

        # Remove equity series suffixes if attached to an equity scrip
        # Only remove if remainder would not be empty
        for suffix in EQUITY_SUFFIXES:
            if s.endswith(suffix):
                candidate = s[: -len(suffix)].strip()
                if candidate:
                    s = candidate
                    break

        return s

    @classmethod
    def _resolve_monthly_expiry(cls, underlying: str, year: int, month: int) -> date:
        """Resolve monthly expiry date (last Thursday for NSE, last Friday for BSE Sensex/Bankex)."""
        target_weekday = 4 if underlying in ("SENSEX", "BANKEX") else 3
        return get_last_weekday_of_month(year, month, target_weekday)

    @classmethod
    def _parse_year(cls, year_str: str) -> int:
        """Convert 2-digit or 4-digit year string to full 4-digit integer."""
        y = int(year_str)
        if y < 100:
            return 2000 + y
        return y

    @classmethod
    def normalize(
        cls, raw_symbol: str, trade_date: date | None = None
    ) -> NormalizedInstrument:
        """Decompose raw ticker into structured NormalizedInstrument metadata."""
        if raw_symbol is None:
            return NormalizedInstrument(
                raw_symbol="",
                normalized_symbol="",
                underlying="",
                instrument_type="UNKNOWN",
                parse_error="Symbol is None",
            )

        clean = cls.clean_symbol(raw_symbol)

        if not clean:
            return NormalizedInstrument(
                raw_symbol=raw_symbol,
                normalized_symbol="",
                underlying="",
                instrument_type="UNKNOWN",
                parse_error="Symbol is empty or whitespace",
            )

        # Reject symbols with illegal characters
        if re.search(r"[^\w\s\-/:.&]", clean):
            return NormalizedInstrument(
                raw_symbol=raw_symbol,
                normalized_symbol=clean,
                underlying="",
                instrument_type="UNKNOWN",
                parse_error="Symbol contains invalid characters",
            )

        # Purely numeric check
        if clean.isdigit():
            return NormalizedInstrument(
                raw_symbol=raw_symbol,
                normalized_symbol=clean,
                underlying="",
                instrument_type="UNKNOWN",
                parse_error="Symbol cannot be purely numeric",
            )

        # ---------------------------------------------------------------------
        # 1. Compact Weekly Options (NSE Standard): e.g. NIFTY24O1725000CE
        # ---------------------------------------------------------------------
        m_weekly_opt = RE_WEEKLY_OPT.match(clean)
        if m_weekly_opt:
            underlying, yy_str, m_code, dd_str, strike_str, opt_type = m_weekly_opt.groups()
            year = cls._parse_year(yy_str)
            month = WEEKLY_MONTH_MAP.get(m_code)
            day = int(dd_str)

            if month is None:
                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=clean,
                    underlying=underlying,
                    instrument_type="UNKNOWN",
                    parse_error=f"Invalid weekly month code: {m_code}",
                )

            try:
                exp_date = date(year, month, day)
            except ValueError as e:
                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=clean,
                    underlying=underlying,
                    instrument_type="UNKNOWN",
                    parse_error=f"Invalid calendar date for weekly option: {e}",
                )

            try:
                strike = Decimal(strike_str)
            except InvalidOperation:
                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=clean,
                    underlying=underlying,
                    instrument_type="UNKNOWN",
                    parse_error=f"Invalid strike price format: {strike_str}",
                )

            effective_date = trade_date or exp_date
            lot = get_lot_size(underlying, effective_date)
            canonical_sym = f"{underlying}{yy_str}{m_code}{dd_str}{strike_str}{opt_type}"

            return NormalizedInstrument(
                raw_symbol=raw_symbol,
                normalized_symbol=canonical_sym,
                underlying=underlying,
                instrument_type="OPTION",
                option_type=opt_type,  # type: ignore[arg-type]
                strike_price=strike,
                expiry_date=exp_date,
                lot_size=lot,
                is_derivative=True,
            )

        # ---------------------------------------------------------------------
        # 2. Compact Monthly Options: e.g. NIFTY24OCT25000CE, IDEA24OCT12.50PE
        # ---------------------------------------------------------------------
        m_monthly_opt = RE_MONTHLY_OPT.match(clean)
        if m_monthly_opt:
            underlying, yy_str, mmm, strike_str, opt_type = m_monthly_opt.groups()
            month = MONTH_NAME_TO_INT.get(mmm)
            if month is not None:
                year = cls._parse_year(yy_str)
                exp_date = cls._resolve_monthly_expiry(underlying, year, month)
                try:
                    strike = Decimal(strike_str)
                except InvalidOperation:
                    return NormalizedInstrument(
                        raw_symbol=raw_symbol,
                        normalized_symbol=clean,
                        underlying=underlying,
                        instrument_type="UNKNOWN",
                        parse_error=f"Invalid strike price: {strike_str}",
                    )

                effective_date = trade_date or exp_date
                lot = get_lot_size(underlying, effective_date)
                canonical_sym = f"{underlying}{yy_str}{mmm}{strike_str}{opt_type}"

                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=canonical_sym,
                    underlying=underlying,
                    instrument_type="OPTION",
                    option_type=opt_type,  # type: ignore[arg-type]
                    strike_price=strike,
                    expiry_date=exp_date,
                    lot_size=lot,
                    is_derivative=True,
                )

        # ---------------------------------------------------------------------
        # 3. Compact Monthly Futures: e.g. NIFTY24OCTFUT, RELIANCE24OCTFUT
        # ---------------------------------------------------------------------
        m_monthly_fut = RE_MONTHLY_FUT.match(clean)
        if m_monthly_fut:
            underlying, yy_str, mmm = m_monthly_fut.groups()
            month = MONTH_NAME_TO_INT.get(mmm)
            if month is not None:
                year = cls._parse_year(yy_str)
                exp_date = cls._resolve_monthly_expiry(underlying, year, month)
                effective_date = trade_date or exp_date
                lot = get_lot_size(underlying, effective_date)
                canonical_sym = f"{underlying}{yy_str}{mmm}FUT"

                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=canonical_sym,
                    underlying=underlying,
                    instrument_type="FUTURE",
                    expiry_date=exp_date,
                    lot_size=lot,
                    is_derivative=True,
                )

        # ---------------------------------------------------------------------
        # 4. Delimited Options with full date: e.g. BANKNIFTY 30-OCT-2024 PE 52000
        # ---------------------------------------------------------------------
        m_del_opt_full = RE_DELIMITED_OPT_FULL_DATE.match(clean)
        if m_del_opt_full:
            (
                underlying,
                dd_str,
                mmm,
                yy_str,
                opt_type1,
                strike_str1,
                strike_str2,
                opt_type2,
            ) = m_del_opt_full.groups()

            opt_type = opt_type1 or opt_type2
            strike_str = strike_str1 or strike_str2
            month = MONTH_NAME_TO_INT.get(mmm)

            if month is not None and opt_type and strike_str:
                year = cls._parse_year(yy_str)
                day = int(dd_str)
                try:
                    exp_date = date(year, month, day)
                except ValueError as e:
                    return NormalizedInstrument(
                        raw_symbol=raw_symbol,
                        normalized_symbol=clean,
                        underlying=underlying,
                        instrument_type="UNKNOWN",
                        parse_error=f"Invalid calendar date: {e}",
                    )

                try:
                    strike = Decimal(strike_str)
                except InvalidOperation:
                    return NormalizedInstrument(
                        raw_symbol=raw_symbol,
                        normalized_symbol=clean,
                        underlying=underlying,
                        instrument_type="UNKNOWN",
                        parse_error=f"Invalid strike price: {strike_str}",
                    )

                effective_date = trade_date or exp_date
                lot = get_lot_size(underlying, effective_date)
                canonical_sym = f"{underlying} {day:02d}-{mmm}-{year} {strike_str} {opt_type}"

                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=canonical_sym,
                    underlying=underlying,
                    instrument_type="OPTION",
                    option_type=opt_type,  # type: ignore[arg-type]
                    strike_price=strike,
                    expiry_date=exp_date,
                    lot_size=lot,
                    is_derivative=True,
                )

        # ---------------------------------------------------------------------
        # 5. Delimited Options with Month & Year: e.g. NIFTY 24 OCT 25000 CE
        # ---------------------------------------------------------------------
        m_del_opt_my = RE_DELIMITED_OPT_MONTH_YEAR.match(clean)
        if m_del_opt_my:
            (
                underlying,
                yy_str,
                mmm,
                opt_type1,
                strike_str1,
                strike_str2,
                opt_type2,
            ) = m_del_opt_my.groups()

            opt_type = opt_type1 or opt_type2
            strike_str = strike_str1 or strike_str2
            month = MONTH_NAME_TO_INT.get(mmm)

            if month is not None and opt_type and strike_str:
                year = cls._parse_year(yy_str)
                exp_date = cls._resolve_monthly_expiry(underlying, year, month)
                try:
                    strike = Decimal(strike_str)
                except InvalidOperation:
                    return NormalizedInstrument(
                        raw_symbol=raw_symbol,
                        normalized_symbol=clean,
                        underlying=underlying,
                        instrument_type="UNKNOWN",
                        parse_error=f"Invalid strike price: {strike_str}",
                    )

                effective_date = trade_date or exp_date
                lot = get_lot_size(underlying, effective_date)
                canonical_sym = f"{underlying}{yy_str}{mmm}{strike_str}{opt_type}"

                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=canonical_sym,
                    underlying=underlying,
                    instrument_type="OPTION",
                    option_type=opt_type,  # type: ignore[arg-type]
                    strike_price=strike,
                    expiry_date=exp_date,
                    lot_size=lot,
                    is_derivative=True,
                )

        # ---------------------------------------------------------------------
        # 6. Delimited Futures with full date: e.g. NIFTY 31-OCT-2024 FUT
        # ---------------------------------------------------------------------
        m_del_fut_full = RE_DELIMITED_FUT_FULL_DATE.match(clean)
        if m_del_fut_full:
            underlying, dd_str, mmm, yy_str = m_del_fut_full.groups()
            month = MONTH_NAME_TO_INT.get(mmm)
            if month is not None:
                year = cls._parse_year(yy_str)
                day = int(dd_str)
                try:
                    exp_date = date(year, month, day)
                except ValueError as e:
                    return NormalizedInstrument(
                        raw_symbol=raw_symbol,
                        normalized_symbol=clean,
                        underlying=underlying,
                        instrument_type="UNKNOWN",
                        parse_error=f"Invalid calendar date: {e}",
                    )

                effective_date = trade_date or exp_date
                lot = get_lot_size(underlying, effective_date)
                canonical_sym = f"{underlying} {day:02d}-{mmm}-{year} FUT"

                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=canonical_sym,
                    underlying=underlying,
                    instrument_type="FUTURE",
                    expiry_date=exp_date,
                    lot_size=lot,
                    is_derivative=True,
                )

        # ---------------------------------------------------------------------
        # 7. Delimited Futures with Month & Year: e.g. RELIANCE 24 OCT FUT
        # ---------------------------------------------------------------------
        m_del_fut_my = RE_DELIMITED_FUT_MONTH_YEAR.match(clean)
        if m_del_fut_my:
            underlying, yy_str, mmm = m_del_fut_my.groups()
            month = MONTH_NAME_TO_INT.get(mmm)
            if month is not None:
                year = cls._parse_year(yy_str)
                exp_date = cls._resolve_monthly_expiry(underlying, year, month)
                effective_date = trade_date or exp_date
                lot = get_lot_size(underlying, effective_date)
                canonical_sym = f"{underlying}{yy_str}{mmm}FUT"

                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=canonical_sym,
                    underlying=underlying,
                    instrument_type="FUTURE",
                    expiry_date=exp_date,
                    lot_size=lot,
                    is_derivative=True,
                )

        # ---------------------------------------------------------------------
        # 8. Currency Pairs: e.g. USDINR, EURINR
        # ---------------------------------------------------------------------
        if clean in CURRENCY_SYMBOLS:
            return NormalizedInstrument(
                raw_symbol=raw_symbol,
                normalized_symbol=clean,
                underlying=clean,
                instrument_type="CURRENCY",
                lot_size=1,
                is_derivative=False,
            )

        # ---------------------------------------------------------------------
        # 9. Commodity Spot: e.g. GOLD, SILVER, CRUDEOIL
        # ---------------------------------------------------------------------
        if clean in COMMODITY_SYMBOLS:
            return NormalizedInstrument(
                raw_symbol=raw_symbol,
                normalized_symbol=clean,
                underlying=clean,
                instrument_type="COMMODITY",
                lot_size=1,
                is_derivative=False,
            )

        # ---------------------------------------------------------------------
        # 10. Cash Equities: e.g. RELIANCE, TCS, INFY, HDFCBANK, TATAMOTORS, M&M
        # ---------------------------------------------------------------------
        # Must be valid scrip identifier without unparsed derivative tokens
        if re.match(r"^[A-Z0-9&]{1,25}$", clean):
            # Guard against strings ending with orphan derivative suffixes like FUT, CE, PE
            if clean.endswith("FUT") and len(clean) > 5:
                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=clean,
                    underlying=clean,
                    instrument_type="UNKNOWN",
                    parse_error="Unrecognized futures format",
                )
            if clean.endswith(("CE", "PE")) and any(c.isdigit() for c in clean):
                return NormalizedInstrument(
                    raw_symbol=raw_symbol,
                    normalized_symbol=clean,
                    underlying=clean,
                    instrument_type="UNKNOWN",
                    parse_error="Unrecognized option format",
                )

            return NormalizedInstrument(
                raw_symbol=raw_symbol,
                normalized_symbol=clean,
                underlying=clean,
                instrument_type="EQUITY",
                lot_size=1,
                is_derivative=False,
            )

        # ---------------------------------------------------------------------
        # 11. Fallback / Unrecognized Format
        # ---------------------------------------------------------------------
        return NormalizedInstrument(
            raw_symbol=raw_symbol,
            normalized_symbol=clean,
            underlying="",
            instrument_type="UNKNOWN",
            parse_error="Unrecognized ticker format",
        )


def normalize_instrument(
    raw_symbol: str, trade_date: date | None = None
) -> NormalizedInstrument:
    """Convenience functional wrapper for InstrumentNormalizer.normalize."""
    return InstrumentNormalizer.normalize(raw_symbol, trade_date)
