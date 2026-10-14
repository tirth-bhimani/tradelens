"""Custom Column Mapping CSV Parser Implementation.

Maintained for backward compatibility; subclasses UniversalTradeParser.
"""

from __future__ import annotations

from typing import Optional

from app.models.fills import CustomColumnMapping
from app.parsers.universal import UniversalTradeParser


class CustomCsvParser(UniversalTradeParser):
    """Parses arbitrary CSV files using user-provided or auto-inferred column mappings."""

    broker_name: str = "CUSTOM"

    def __init__(self, mapping: Optional[CustomColumnMapping] = None) -> None:
        super().__init__(mapping=mapping, broker_name="CUSTOM")
