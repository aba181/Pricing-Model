"""Quote service utilities.

Pure functions with no database or I/O dependencies.
Handles Decimal-safe JSON serialization for JSONB storage.
"""
from __future__ import annotations

import json
from decimal import Decimal


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that converts Decimal to string for precision preservation.

    Without this, json.dumps() converts Decimal("185000.00") to 185000.0,
    losing precision and potentially introducing floating-point artifacts.

    Usage:
        json.dumps({"rate": Decimal("185000.00")}, cls=DecimalEncoder)
        # => '{"rate": "185000.00"}'
    """

    def default(self, o: object) -> object:
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)


def assemble_snapshot_json(data: dict) -> str:
    """Serialize a dict to JSON string with Decimal-safe encoding.

    Convenience wrapper for json.dumps with DecimalEncoder.
    Used by QuoteRepository when inserting JSONB columns.
    """
    return json.dumps(data, cls=DecimalEncoder)
