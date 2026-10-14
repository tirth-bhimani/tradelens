"""TradeLens Normalized Instrument Models and Type Definitions."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

InstrumentType = Literal["EQUITY", "FUTURE", "OPTION", "COMMODITY", "CURRENCY", "UNKNOWN"]
OptionType = Literal["CE", "PE"]


class NormalizedInstrument(BaseModel):
    """Normalized structured representation of an Indian financial instrument."""

    raw_symbol: str = Field(..., description="Original raw ticker symbol from broker CSV")
    normalized_symbol: str = Field(..., description="Cleaned uppercase canonical symbol without exchange noise")
    underlying: str = Field(..., description="Root scrip or index symbol, e.g. NIFTY, RELIANCE")
    instrument_type: InstrumentType = Field(..., description="Classification category")
    option_type: OptionType | None = Field(default=None, description="Call (CE) or Put (PE) if option")
    strike_price: Decimal | None = Field(default=None, description="Strike price if option contract")
    expiry_date: date | None = Field(default=None, description="Expiry date if derivative contract")
    lot_size: int = Field(default=1, gt=0, description="Standard market lot size per trade unit")
    is_derivative: bool = Field(default=False, description="True if Futures or Options contract")
    contract_key: str = Field(default="", description="Canonical unique key for FIFO fill pairing matching in Task 8")
    parse_error: str | None = Field(default=None, description="Reason if symbol parsing was imperfect")

    @model_validator(mode="after")
    def populate_contract_key(self) -> NormalizedInstrument:
        """Ensure canonical contract key is populated for downstream FIFO pairing."""
        if not self.contract_key:
            if self.instrument_type == "EQUITY":
                self.contract_key = f"EQ:{self.underlying}"
            elif self.instrument_type == "FUTURE":
                exp_str = self.expiry_date.isoformat() if self.expiry_date else ""
                self.contract_key = f"FUT:{self.underlying}:{exp_str}"
            elif self.instrument_type == "OPTION":
                exp_str = self.expiry_date.isoformat() if self.expiry_date else ""
                strike_str = str(self.strike_price) if self.strike_price is not None else ""
                opt_str = self.option_type or ""
                self.contract_key = f"OPT:{self.underlying}:{exp_str}:{strike_str}:{opt_str}"
            elif self.instrument_type == "COMMODITY":
                exp_str = self.expiry_date.isoformat() if self.expiry_date else ""
                self.contract_key = f"COMM:{self.underlying}:{exp_str}"
            elif self.instrument_type == "CURRENCY":
                exp_str = self.expiry_date.isoformat() if self.expiry_date else ""
                self.contract_key = f"CURR:{self.underlying}:{exp_str}"
            else:
                self.contract_key = f"UNKNOWN:{self.raw_symbol.strip().upper()}"
        return self
