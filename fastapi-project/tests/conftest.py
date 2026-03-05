"""Test configuration with in-memory mock database layer.

Overrides the get_db dependency with a mock asyncpg.Connection that stores
data in-memory. This allows integration tests to run without a real PostgreSQL
database. The mock supports the same interface as BaseRepository expects:
fetchrow, fetch, and execute.

Supports tables: users, aircraft, aircraft_rates, epr_matrix_rows.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import get_db
from app.auth.service import hash_password


# ---- In-memory mock database ----

class MockRecord(dict):
    """Dict subclass that supports attribute access like asyncpg.Record."""
    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError:
            raise AttributeError(key)


def _detect_table(query: str) -> str:
    """Detect the primary table referenced in a SQL query.

    For JOINs (e.g., aircraft LEFT JOIN aircraft_rates), the primary table
    is determined by the FROM clause (aircraft), not the joined table.
    For INSERT/UPDATE, we check the INTO/UPDATE target.
    """
    q_upper = query.upper()

    # EPR matrix is unambiguous
    if "FROM EPR_MATRIX_ROWS" in q_upper or "INTO EPR_MATRIX_ROWS" in q_upper:
        return "epr_matrix_rows"

    # Check primary table via FROM (SELECT) or INTO/UPDATE (mutations)
    if "FROM AIRCRAFT " in q_upper or "FROM AIRCRAFT\n" in q_upper:
        # This catches "FROM aircraft a LEFT JOIN aircraft_rates r ..."
        return "aircraft"
    if "INTO AIRCRAFT_RATES" in q_upper or "UPDATE AIRCRAFT_RATES" in q_upper:
        return "aircraft_rates"
    if "INTO AIRCRAFT " in q_upper or "INTO AIRCRAFT\n" in q_upper or "INTO AIRCRAFT(" in q_upper:
        return "aircraft"

    # Fallback checks
    if "AIRCRAFT_RATES" in q_upper:
        return "aircraft_rates"
    if "AIRCRAFT" in q_upper:
        return "aircraft"
    if "USERS" in q_upper or "EMAIL" in q_upper:
        return "users"
    return "users"


class MockConnection:
    """Mock asyncpg.Connection backed by an in-memory dict store.

    Supports the subset of operations used by BaseRepository:
    fetchrow, fetch, execute.

    Routes queries to table-specific handlers based on table name detection.
    """

    def __init__(self, store: dict):
        self.store = store

    async def fetchrow(self, query: str, *args: Any) -> MockRecord | None:
        """Execute query and return first result row."""
        rows = await self._execute_query(query, args)
        return rows[0] if rows else None

    async def fetch(self, query: str, *args: Any) -> list[MockRecord]:
        """Execute query and return all result rows."""
        return await self._execute_query(query, args)

    async def execute(self, query: str, *args: Any) -> str:
        """Execute a mutation query and return status string."""
        await self._execute_query(query, args)
        return "OK"

    async def _execute_query(self, query: str, args: tuple) -> list[MockRecord]:
        """Route queries to appropriate handler based on SQL keywords and table."""
        q = query.strip().upper()
        table = _detect_table(query)

        if q.startswith("SELECT"):
            if table == "users":
                return self._handle_users_select(query, args)
            elif table in ("aircraft", "aircraft_rates"):
                return self._handle_aircraft_select(query, args)
            elif table == "epr_matrix_rows":
                return self._handle_epr_select(query, args)
        elif q.startswith("INSERT"):
            if table == "users":
                return self._handle_users_insert(query, args)
            elif table == "aircraft":
                return self._handle_aircraft_insert(query, args)
            elif table == "aircraft_rates":
                return self._handle_aircraft_rates_insert(query, args)
            elif table == "epr_matrix_rows":
                return self._handle_epr_insert(query, args)
        elif q.startswith("UPDATE"):
            if table == "users":
                return self._handle_users_update(query, args)
            elif table == "aircraft_rates":
                return self._handle_aircraft_rates_update(query, args)
        elif q.startswith("DELETE"):
            if table == "users":
                return self._handle_users_delete(query, args)
        return []

    # ---- Users table handlers ----

    def _handle_users_select(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle SELECT queries on the users table."""
        users = self.store.get("users", [])
        q_upper = query.upper()

        if "WHERE EMAIL" in q_upper and "IS_ACTIVE" in q_upper:
            email = args[0]
            return [MockRecord(u) for u in users if u["email"] == email and u["is_active"]]
        elif "WHERE EMAIL" in q_upper:
            email = args[0]
            return [MockRecord(u) for u in users if u["email"] == email]
        elif "WHERE ID" in q_upper:
            user_id = args[0]
            return [MockRecord(u) for u in users if u["id"] == user_id]
        elif "ORDER BY" in q_upper:
            sorted_users = sorted(users, key=lambda u: u["created_at"], reverse=True)
            return [MockRecord(u) for u in sorted_users]
        return [MockRecord(u) for u in users]

    def _handle_users_insert(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle INSERT into users table."""
        users = self.store.setdefault("users", [])
        now = datetime.now(timezone.utc)

        max_id = max((u["id"] for u in users), default=0)
        new_id = max_id + 1

        new_user = MockRecord({
            "id": new_id,
            "email": args[0],
            "hashed_password": args[1],
            "role": args[2] if len(args) > 2 else "user",
            "full_name": args[3] if len(args) > 3 else None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })
        users.append(dict(new_user))

        if "RETURNING" in query.upper():
            return [new_user]
        return []

    def _handle_users_update(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle UPDATE on users table."""
        users = self.store.get("users", [])
        q_upper = query.upper()
        now = datetime.now(timezone.utc)

        if "IS_ACTIVE = FALSE" in q_upper:
            user_id = args[0]
            for u in users:
                if u["id"] == user_id:
                    u["is_active"] = False
                    u["updated_at"] = now
                    return [MockRecord(u)] if "RETURNING" in q_upper else []
            return []

        # Dynamic update_user: parse SET clause to find fields
        user_id = args[-1]
        target = None
        for u in users:
            if u["id"] == user_id:
                target = u
                break
        if not target:
            return []

        set_match = re.search(r'SET\s+(.+?)\s+WHERE', query, re.IGNORECASE | re.DOTALL)
        if set_match:
            set_clause = set_match.group(1)
            parts = [p.strip() for p in set_clause.split(",")]
            arg_idx = 0
            for part in parts:
                if "NOW()" in part.upper():
                    field = part.split("=")[0].strip()
                    target[field] = now
                elif "=" in part:
                    field = part.split("=")[0].strip()
                    target[field] = args[arg_idx]
                    arg_idx += 1

        target["updated_at"] = now

        if "RETURNING" in q_upper:
            return [MockRecord(target)]
        return []

    def _handle_users_delete(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle DELETE from users table."""
        users = self.store.get("users", [])
        if args:
            self.store["users"] = [u for u in users if u.get("email") != args[0] and u.get("id") != args[0]]
        return []

    # ---- Aircraft table handlers ----

    def _handle_aircraft_select(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle SELECT queries on aircraft (with optional JOIN to aircraft_rates)."""
        aircraft_list = self.store.get("aircraft", [])
        rates_list = self.store.get("aircraft_rates", [])
        q_upper = query.upper()

        # Build rates lookup by aircraft_id
        rates_by_id = {r["aircraft_id"]: r for r in rates_list}

        # Check if this is a JOIN query (aircraft + rates)
        is_join = "JOIN" in q_upper or "AIRCRAFT_RATES" in q_upper

        if "ILIKE" in q_upper:
            # Search filter: msn::TEXT ILIKE $1 OR registration ILIKE $1
            search_pattern = args[0]  # e.g., "%3055%"
            search_term = search_pattern.strip("%").upper()
            results = []
            for a in sorted(aircraft_list, key=lambda x: x["msn"]):
                msn_match = search_term in str(a["msn"]).upper()
                reg_match = a.get("registration") and search_term in a["registration"].upper()
                if msn_match or reg_match:
                    row = dict(a)
                    if is_join:
                        rates = rates_by_id.get(a["id"], {})
                        row.update(rates)
                    results.append(MockRecord(row))
            return results

        if "WHERE A.MSN" in q_upper or "WHERE MSN" in q_upper:
            # fetch_by_msn: WHERE a.msn = $1
            msn = args[0]
            results = []
            for a in aircraft_list:
                if a["msn"] == msn:
                    row = dict(a)
                    if is_join:
                        rates = rates_by_id.get(a["id"], {})
                        row.update(rates)
                    results.append(MockRecord(row))
            return results

        if "WHERE A.ID" in q_upper or ("WHERE ID" in q_upper and "AIRCRAFT" in q_upper):
            # fetch_by_id: WHERE id = $1
            aid = args[0]
            results = []
            for a in aircraft_list:
                if a["id"] == aid:
                    row = dict(a)
                    if is_join:
                        rates = rates_by_id.get(a["id"], {})
                        row.update(rates)
                    results.append(MockRecord(row))
            return results

        # Default: list all aircraft ordered by MSN
        results = []
        for a in sorted(aircraft_list, key=lambda x: x["msn"]):
            row = dict(a)
            if is_join:
                rates = rates_by_id.get(a["id"], {})
                row.update(rates)
            results.append(MockRecord(row))
        return results

    def _handle_aircraft_insert(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle INSERT into aircraft table (including ON CONFLICT upsert)."""
        aircraft_list = self.store.setdefault("aircraft", [])
        now = datetime.now(timezone.utc)
        q_upper = query.upper()

        msn = args[0]
        aircraft_type = args[1] if len(args) > 1 else "A320"
        registration = args[2] if len(args) > 2 else None

        # Check ON CONFLICT (upsert)
        if "ON CONFLICT" in q_upper:
            for a in aircraft_list:
                if a["msn"] == msn:
                    a["updated_at"] = now
                    if "RETURNING" in q_upper:
                        return [MockRecord(a)]
                    return []

        max_id = max((a["id"] for a in aircraft_list), default=0)
        new_aircraft = MockRecord({
            "id": max_id + 1,
            "msn": msn,
            "aircraft_type": aircraft_type,
            "registration": registration,
            "created_at": now,
            "updated_at": now,
        })
        aircraft_list.append(dict(new_aircraft))

        if "RETURNING" in q_upper:
            return [new_aircraft]
        return []

    def _handle_aircraft_rates_insert(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle INSERT into aircraft_rates (including ON CONFLICT upsert)."""
        rates_list = self.store.setdefault("aircraft_rates", [])
        now = datetime.now(timezone.utc)
        q_upper = query.upper()

        aircraft_id = args[0]

        # Parse column names from the INSERT statement
        col_match = re.search(r'INSERT\s+INTO\s+aircraft_rates\s*\((.+?)\)\s*VALUES', query, re.IGNORECASE | re.DOTALL)
        if col_match:
            columns = [c.strip() for c in col_match.group(1).split(",")]
        else:
            columns = []

        # Build row from columns and args
        new_row = {"aircraft_id": aircraft_id}
        for i, col in enumerate(columns):
            if i < len(args):
                new_row[col] = args[i]
        new_row["created_at"] = now
        new_row["updated_at"] = now

        # Handle ON CONFLICT (upsert)
        if "ON CONFLICT" in q_upper:
            for r in rates_list:
                if r["aircraft_id"] == aircraft_id:
                    r.update({k: v for k, v in new_row.items() if k not in ("id", "created_at")})
                    r["updated_at"] = now
                    if "RETURNING" in q_upper:
                        return [MockRecord(r)]
                    return []

        max_id = max((r["id"] for r in rates_list), default=0)
        new_row["id"] = max_id + 1
        rates_list.append(new_row)

        if "RETURNING" in q_upper:
            return [MockRecord(new_row)]
        return []

    def _handle_aircraft_rates_update(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle UPDATE on aircraft_rates table."""
        rates_list = self.store.get("aircraft_rates", [])
        q_upper = query.upper()
        now = datetime.now(timezone.utc)

        # The last arg is aircraft_id (WHERE aircraft_id=$N)
        aircraft_id = args[-1]
        target = None
        for r in rates_list:
            if r["aircraft_id"] == aircraft_id:
                target = r
                break
        if not target:
            return []

        # Parse SET clause and apply updates
        set_match = re.search(r'SET\s+(.+?)\s+WHERE', query, re.IGNORECASE | re.DOTALL)
        if set_match:
            set_clause = set_match.group(1)
            parts = [p.strip() for p in set_clause.split(",")]
            arg_idx = 0
            for part in parts:
                if "NOW()" in part.upper():
                    field = part.split("=")[0].strip()
                    target[field] = now
                elif "=" in part:
                    field = part.split("=")[0].strip()
                    target[field] = args[arg_idx]
                    arg_idx += 1

        target["updated_at"] = now

        if "RETURNING" in q_upper:
            return [MockRecord(target)]
        return []

    # ---- EPR matrix handlers ----

    def _handle_epr_select(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle SELECT queries on epr_matrix_rows."""
        epr_rows = self.store.get("epr_matrix_rows", [])

        if args:
            aircraft_id = args[0]
            filtered = [r for r in epr_rows if r["aircraft_id"] == aircraft_id]
        else:
            filtered = list(epr_rows)

        # Sort by cycle_ratio
        filtered.sort(key=lambda r: r["cycle_ratio"])

        # Return only the columns requested (cycle_ratio, benign_rate, hot_rate)
        q_upper = query.upper()
        if "SELECT CYCLE_RATIO" in q_upper or "SELECT\n" in q_upper:
            return [
                MockRecord({
                    "cycle_ratio": r["cycle_ratio"],
                    "benign_rate": r["benign_rate"],
                    "hot_rate": r["hot_rate"],
                })
                for r in filtered
            ]
        return [MockRecord(r) for r in filtered]

    def _handle_epr_insert(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle INSERT into epr_matrix_rows (including ON CONFLICT upsert)."""
        epr_rows = self.store.setdefault("epr_matrix_rows", [])
        now = datetime.now(timezone.utc)
        q_upper = query.upper()

        aircraft_id = args[0]
        cycle_ratio = args[1]
        benign_rate = args[2]
        hot_rate = args[3]

        # Handle ON CONFLICT (upsert)
        if "ON CONFLICT" in q_upper:
            for r in epr_rows:
                if r["aircraft_id"] == aircraft_id and r["cycle_ratio"] == cycle_ratio:
                    r["benign_rate"] = benign_rate
                    r["hot_rate"] = hot_rate
                    if "RETURNING" in q_upper:
                        return [MockRecord(r)]
                    return []

        max_id = max((r["id"] for r in epr_rows), default=0)
        new_row = {
            "id": max_id + 1,
            "aircraft_id": aircraft_id,
            "cycle_ratio": cycle_ratio,
            "benign_rate": benign_rate,
            "hot_rate": hot_rate,
            "created_at": now,
        }
        epr_rows.append(new_row)

        if "RETURNING" in q_upper:
            return [MockRecord(new_row)]
        return []


# ---- Fixtures ----

@pytest.fixture
def db_store():
    """Shared in-memory store for mock database."""
    return {"users": [], "aircraft": [], "aircraft_rates": [], "epr_matrix_rows": []}


@pytest.fixture
def mock_db(db_store):
    """Mock database connection using in-memory store."""
    return MockConnection(db_store)


@pytest.fixture
async def async_client(mock_db):
    """Async HTTP test client with mocked database dependency."""

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def test_admin_user(db_store):
    """Insert an admin user into the mock DB store."""
    now = datetime.now(timezone.utc)
    user = {
        "id": 1,
        "email": "admin@test.com",
        "hashed_password": hash_password("adminpass123"),
        "role": "admin",
        "full_name": "Test Admin",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    db_store["users"].append(user)
    return {"id": 1, "email": "admin@test.com", "role": "admin"}


@pytest.fixture
def test_regular_user(db_store):
    """Insert a regular user into the mock DB store."""
    now = datetime.now(timezone.utc)
    user = {
        "id": 2,
        "email": "user@test.com",
        "hashed_password": hash_password("userpass123"),
        "role": "user",
        "full_name": "Test User",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    db_store["users"].append(user)
    return {"id": 2, "email": "user@test.com", "role": "user"}


@pytest.fixture
def test_aircraft_data(db_store):
    """Insert 2 test aircraft with rates and EPR rows into the mock store."""
    now = datetime.now(timezone.utc)

    db_store["aircraft"] = [
        {
            "id": 1,
            "msn": 3055,
            "aircraft_type": "A320",
            "registration": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": 2,
            "msn": 3378,
            "aircraft_type": "A320",
            "registration": "LZ-AWA",
            "created_at": now,
            "updated_at": now,
        },
    ]
    db_store["aircraft_rates"] = [
        {
            "id": 1,
            "aircraft_id": 1,
            "lease_rent_usd": Decimal("185000.00"),
            "six_year_check_usd": Decimal("15413.95"),
            "twelve_year_check_usd": Decimal("8418.19"),
            "ldg_usd": Decimal("4333.21"),
            "apu_rate_usd": Decimal("59.7400"),
            "llp1_rate_usd": Decimal("317.9050"),
            "llp2_rate_usd": Decimal("317.9050"),
            "epr_escalation": Decimal("0.0500"),
            "llp_escalation": Decimal("0.0800"),
            "af_apu_escalation": Decimal("0.0300"),
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": 2,
            "aircraft_id": 2,
            "lease_rent_usd": Decimal("185000.00"),
            "six_year_check_usd": Decimal("14334.75"),
            "twelve_year_check_usd": Decimal("7513.07"),
            "ldg_usd": Decimal("4864.50"),
            "apu_rate_usd": Decimal("53.8200"),
            "llp1_rate_usd": Decimal("341.7750"),
            "llp2_rate_usd": Decimal("353.1350"),
            "epr_escalation": Decimal("0.0300"),
            "llp_escalation": Decimal("0.0850"),
            "af_apu_escalation": Decimal("0.0350"),
            "created_at": now,
            "updated_at": now,
        },
    ]
    db_store["epr_matrix_rows"] = [
        {
            "id": 1,
            "aircraft_id": 1,
            "cycle_ratio": Decimal("1.0000"),
            "benign_rate": Decimal("448.22"),
            "hot_rate": Decimal("672.33"),
            "created_at": now,
        },
        {
            "id": 2,
            "aircraft_id": 1,
            "cycle_ratio": Decimal("1.5000"),
            "benign_rate": Decimal("319.07"),
            "hot_rate": Decimal("478.61"),
            "created_at": now,
        },
        {
            "id": 3,
            "aircraft_id": 2,
            "cycle_ratio": Decimal("0.6200"),
            "benign_rate": Decimal("669.32"),
            "hot_rate": Decimal("870.73"),
            "created_at": now,
        },
    ]

    return {
        "aircraft": db_store["aircraft"],
        "rates": db_store["aircraft_rates"],
        "epr": db_store["epr_matrix_rows"],
    }
