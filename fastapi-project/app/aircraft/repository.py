from __future__ import annotations

from app.db.base_repository import BaseRepository


class AircraftRepository(BaseRepository):
    """Repository for aircraft, rates, and EPR matrix operations."""

    async def list_aircraft(self, search: str | None = None) -> list[dict]:
        """List all aircraft with their rates, optionally filtered by MSN or registration."""
        query = """
            SELECT a.id, a.msn, a.aircraft_type, a.registration,
                   r.lease_rent_usd, r.six_year_check_usd,
                   r.twelve_year_check_usd, r.ldg_usd,
                   r.apu_rate_usd, r.llp1_rate_usd, r.llp2_rate_usd
            FROM aircraft a
            LEFT JOIN aircraft_rates r ON r.aircraft_id = a.id
        """
        if search:
            query += """
                WHERE a.msn::TEXT ILIKE $1
                   OR a.registration ILIKE $1
            """
            query += " ORDER BY a.msn"
            return await self.fetch_many(query, f"%{search}%")
        query += " ORDER BY a.msn"
        return await self.fetch_many(query)

    async def fetch_by_msn(self, msn: int) -> dict | None:
        """Fetch aircraft with full rates by MSN."""
        return await self.fetch_one(
            """
            SELECT a.*, r.lease_rent_usd, r.six_year_check_usd,
                   r.twelve_year_check_usd, r.ldg_usd,
                   r.apu_rate_usd, r.llp1_rate_usd, r.llp2_rate_usd,
                   r.epr_escalation, r.llp_escalation, r.af_apu_escalation
            FROM aircraft a
            LEFT JOIN aircraft_rates r ON r.aircraft_id = a.id
            WHERE a.msn = $1
            """,
            msn,
        )

    async def fetch_by_id(self, aircraft_id: int) -> dict | None:
        """Fetch aircraft by primary key."""
        return await self.fetch_one(
            "SELECT * FROM aircraft WHERE id = $1", aircraft_id
        )

    async def fetch_epr_matrix(self, aircraft_id: int) -> list[dict]:
        """Fetch EPR matrix rows for an aircraft, ordered by cycle ratio."""
        return await self.fetch_many(
            """
            SELECT cycle_ratio, benign_rate, hot_rate
            FROM epr_matrix_rows
            WHERE aircraft_id = $1
            ORDER BY cycle_ratio
            """,
            aircraft_id,
        )

    async def fetch_epr_matrices_for_ids(self, aircraft_ids: list[int]) -> dict[int, list[dict]]:
        """Fetch EPR matrix rows for multiple aircraft in one query.

        Returns a dict mapping aircraft_id → list of EPR rows (sorted by cycle_ratio).
        """
        if not aircraft_ids:
            return {}
        rows = await self.fetch_many(
            """
            SELECT aircraft_id, cycle_ratio, benign_rate, hot_rate
            FROM epr_matrix_rows
            WHERE aircraft_id = ANY($1)
            ORDER BY aircraft_id, cycle_ratio
            """,
            aircraft_ids,
        )
        result: dict[int, list[dict]] = {}
        for r in rows:
            aid = r["aircraft_id"]
            if aid not in result:
                result[aid] = []
            result[aid].append(r)
        return result

    async def update_rates(self, aircraft_id: int, **fields) -> dict | None:
        """Update cost rate fields for an aircraft. Returns updated row."""
        if not fields:
            return None
        # Dynamic SET clause pattern (same as UserRepository.update_user)
        set_parts = []
        args = []
        for i, (key, value) in enumerate(fields.items(), start=1):
            set_parts.append(f"{key} = ${i}")
            args.append(value)
        set_parts.append("updated_at = NOW()")
        set_clause = ", ".join(set_parts)
        args.append(aircraft_id)
        id_param = f"${len(args)}"
        return await self.fetch_one(
            f"UPDATE aircraft_rates SET {set_clause} WHERE aircraft_id = {id_param} RETURNING *",
            *args,
        )

    async def create_aircraft(
        self,
        msn: int,
        aircraft_type: str = "A320",
        registration: str | None = None,
    ) -> dict:
        """Insert a new aircraft and return the full row."""
        return await self.fetch_one(
            """INSERT INTO aircraft (msn, aircraft_type, registration)
               VALUES ($1, $2, $3)
               RETURNING *""",
            msn,
            aircraft_type,
            registration,
        )

    async def upsert_rates(self, aircraft_id: int, **rate_fields) -> dict | None:
        """Insert or update aircraft rates. Returns the row."""
        field_names = list(rate_fields.keys())
        placeholders = ", ".join(f"${i}" for i in range(2, len(field_names) + 2))
        columns = ", ".join(field_names)
        update_parts = ", ".join(
            f"{name} = EXCLUDED.{name}" for name in field_names
        )
        query = f"""
            INSERT INTO aircraft_rates (aircraft_id, {columns})
            VALUES ($1, {placeholders})
            ON CONFLICT (aircraft_id) DO UPDATE SET
                {update_parts},
                updated_at = NOW()
            RETURNING *
        """
        return await self.fetch_one(
            query, aircraft_id, *rate_fields.values()
        )

    async def upsert_epr_row(
        self,
        aircraft_id: int,
        cycle_ratio,
        benign_rate,
        hot_rate,
    ) -> dict | None:
        """Insert or update a single EPR matrix row."""
        return await self.fetch_one(
            """
            INSERT INTO epr_matrix_rows (aircraft_id, cycle_ratio, benign_rate, hot_rate)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (aircraft_id, cycle_ratio) DO UPDATE SET
                benign_rate = EXCLUDED.benign_rate,
                hot_rate = EXCLUDED.hot_rate
            RETURNING *
            """,
            aircraft_id,
            cycle_ratio,
            benign_rate,
            hot_rate,
        )
