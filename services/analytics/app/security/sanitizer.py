"""TradeLens Python CSV Formula Injection (CWE-1236) Defense Layer.

Neutralizes formula execution prefixes (=, +, -, @, \\t, \\r) while preserving
valid numerical values (e.g. negative P&L figures).
"""

from __future__ import annotations

import csv
import io
import re

DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")
NUMERIC_RE = re.compile(r"^[-+]?\d+(\.\d+)?$")
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def sanitize_csv_cell(cell: str) -> str:
    """Sanitize an individual CSV cell string.

    If the cell begins with an executable trigger character and is not
    purely a numeric value, prepend a single quote (') to neutralize execution.
    """
    if not isinstance(cell, str) or not cell:
        return cell

    # Tab or carriage return at cell start is a direct DDE/formula trigger
    if cell.startswith(("\t", "\r")):
        return f"'{cell}"

    trimmed = cell.strip()
    if trimmed.startswith(DANGEROUS_PREFIXES):
        if NUMERIC_RE.match(trimmed):
            return cell
        return f"'{cell}"

    return cell


def sanitize_csv_stream(raw_text: str) -> tuple[str, int]:
    """Parse a full CSV string and return (sanitized_csv_string, flagged_count)."""
    if not raw_text:
        return "", 0

    reader = csv.reader(io.StringIO(raw_text))
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    flagged_count = 0

    for row in reader:
        new_row = []
        for cell in row:
            sanitized = sanitize_csv_cell(cell)
            if sanitized != cell:
                flagged_count += 1
            new_row.append(sanitized)
        writer.writerow(new_row)

    return out.getvalue(), flagged_count
