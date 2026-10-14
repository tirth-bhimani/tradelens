"""Abstract Base Parser Protocol for Tradebook Ingestion."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from app.models.fills import ParseResult


class BaseParser(ABC):
    """Abstract base class that all broker tradebook parsers implement."""

    broker_name: str = "UNKNOWN"

    @abstractmethod
    def can_parse(self, headers: list[str]) -> bool:
        """Inspect column headers and return True if this parser can handle the CSV format."""
        raise NotImplementedError

    @abstractmethod
    def parse(
        self,
        csv_content: str,
        import_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
    ) -> ParseResult:
        """Parse raw CSV text into a structured ParseResult with validated RawFillCreate models."""
        raise NotImplementedError
