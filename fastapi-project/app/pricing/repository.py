"""Repositories for pricing config, crew config, and project data.

All three extend BaseRepository and follow the same pattern established
in aircraft/repository.py. Config repositories implement append-only
versioning via the is_current flag.
"""
from __future__ import annotations

from app.db.base_repository import BaseRepository


class PricingConfigRepository(BaseRepository):
    """Repository for versioned pricing configuration (append-only)."""

    async def get_current(self) -> dict | None:
        """Fetch the current (active) pricing config row."""
        return await self.fetch_one(
            "SELECT * FROM pricing_config WHERE is_current = TRUE"
        )

    async def get_version(self, version_id: int) -> dict | None:
        """Fetch a specific config version by id (for quote reconstruction)."""
        return await self.fetch_one(
            "SELECT * FROM pricing_config WHERE id = $1", version_id
        )

    async def create_version(self, created_by: int, **fields) -> dict:
        """Create a new config version. Marks previous as non-current.

        This implements append-only versioning: the old row is never mutated,
        only its is_current flag is set to FALSE. A new row is inserted with
        version = old_version + 1 and is_current = TRUE.
        """
        current = await self.get_current()
        new_version = (current["version"] + 1) if current else 1

        # Mark old as non-current
        if current:
            await self.execute(
                "UPDATE pricing_config SET is_current = FALSE WHERE id = $1",
                current["id"],
            )

        # Build the new row from current values + overrides
        base = dict(current) if current else {}
        # Remove metadata fields that shouldn't carry over
        for key in ("id", "created_at", "created_by", "is_current", "version"):
            base.pop(key, None)
        base.update(fields)

        # Dynamic INSERT
        columns = list(base.keys())
        placeholders = ", ".join(f"${i}" for i in range(1, len(columns) + 1))
        col_names = ", ".join(columns)
        args = list(base.values())

        # Add version, created_by, is_current
        extra_offset = len(args) + 1
        col_names += ", version, created_by, is_current"
        placeholders += f", ${extra_offset}, ${extra_offset + 1}, TRUE"
        args.extend([new_version, created_by])

        row = await self.fetch_one(
            f"INSERT INTO pricing_config ({col_names}) VALUES ({placeholders}) RETURNING *",
            *args,
        )
        return row


class CrewConfigRepository(BaseRepository):
    """Repository for versioned crew configuration per aircraft type (append-only)."""

    async def get_current(self, aircraft_type: str) -> dict | None:
        """Fetch the current crew config for a specific aircraft type."""
        return await self.fetch_one(
            "SELECT * FROM crew_config WHERE aircraft_type = $1 AND is_current = TRUE",
            aircraft_type,
        )

    async def get_version(self, version_id: int) -> dict | None:
        """Fetch a specific crew config version by id."""
        return await self.fetch_one(
            "SELECT * FROM crew_config WHERE id = $1", version_id
        )

    async def get_all_current(self) -> list[dict]:
        """Fetch all current crew configs (A320 + A321)."""
        return await self.fetch_many(
            "SELECT * FROM crew_config WHERE is_current = TRUE ORDER BY aircraft_type"
        )

    async def create_version(
        self, aircraft_type: str, created_by: int, **fields
    ) -> dict:
        """Create a new crew config version for an aircraft type.

        Same append-only pattern as PricingConfigRepository.
        """
        current = await self.get_current(aircraft_type)
        new_version = (current["version"] + 1) if current else 1

        # Mark old as non-current
        if current:
            await self.execute(
                "UPDATE crew_config SET is_current = FALSE WHERE id = $1",
                current["id"],
            )

        # Build the new row from current values + overrides
        base = dict(current) if current else {}
        for key in ("id", "created_at", "created_by", "is_current", "version"):
            base.pop(key, None)
        base.update(fields)
        # Ensure aircraft_type is set
        base["aircraft_type"] = aircraft_type

        # Dynamic INSERT
        columns = list(base.keys())
        placeholders = ", ".join(f"${i}" for i in range(1, len(columns) + 1))
        col_names = ", ".join(columns)
        args = list(base.values())

        # Add version, created_by, is_current
        extra_offset = len(args) + 1
        col_names += ", version, created_by, is_current"
        placeholders += f", ${extra_offset}, ${extra_offset + 1}, TRUE"
        args.extend([new_version, created_by])

        row = await self.fetch_one(
            f"INSERT INTO crew_config ({col_names}) VALUES ({placeholders}) RETURNING *",
            *args,
        )
        return row


class ProjectRepository(BaseRepository):
    """Repository for mutable pricing projects and MSN inputs."""

    async def create_project(
        self,
        created_by: int,
        name: str | None = None,
        config_version_id: int | None = None,
        crew_config_a320_id: int | None = None,
        crew_config_a321_id: int | None = None,
    ) -> dict:
        """Create a new pricing project with optional config FK snapshots."""
        return await self.fetch_one(
            """
            INSERT INTO pricing_projects (name, created_by, config_version_id,
                                          crew_config_a320_id, crew_config_a321_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            name,
            created_by,
            config_version_id,
            crew_config_a320_id,
            crew_config_a321_id,
        )

    async def get_project(self, project_id: int) -> dict | None:
        """Fetch a project by id."""
        return await self.fetch_one(
            "SELECT * FROM pricing_projects WHERE id = $1", project_id
        )

    async def list_projects(self, user_id: int) -> list[dict]:
        """List all projects for a user, newest first."""
        return await self.fetch_many(
            "SELECT * FROM pricing_projects WHERE created_by = $1 ORDER BY created_at DESC",
            user_id,
        )

    async def update_project(self, project_id: int, **fields) -> dict | None:
        """Update a project's mutable fields. Returns updated row."""
        if not fields:
            return None
        set_parts = []
        args = []
        for i, (key, value) in enumerate(fields.items(), start=1):
            set_parts.append(f"{key} = ${i}")
            args.append(value)
        set_parts.append("updated_at = NOW()")
        set_clause = ", ".join(set_parts)
        args.append(project_id)
        id_param = f"${len(args)}"
        return await self.fetch_one(
            f"UPDATE pricing_projects SET {set_clause} WHERE id = {id_param} RETURNING *",
            *args,
        )

    async def add_msn_input(self, project_id: int, **fields) -> dict:
        """Add an MSN input row to a project."""
        columns = ["project_id"] + list(fields.keys())
        values = [project_id] + list(fields.values())
        placeholders = ", ".join(f"${i}" for i in range(1, len(values) + 1))
        col_names = ", ".join(columns)
        return await self.fetch_one(
            f"INSERT INTO project_msn_inputs ({col_names}) VALUES ({placeholders}) RETURNING *",
            *values,
        )

    async def update_msn_input(self, input_id: int, **fields) -> dict | None:
        """Update an MSN input row. Returns updated row."""
        if not fields:
            return None
        set_parts = []
        args = []
        for i, (key, value) in enumerate(fields.items(), start=1):
            set_parts.append(f"{key} = ${i}")
            args.append(value)
        set_parts.append("updated_at = NOW()")
        set_clause = ", ".join(set_parts)
        args.append(input_id)
        id_param = f"${len(args)}"
        return await self.fetch_one(
            f"UPDATE project_msn_inputs SET {set_clause} WHERE id = {id_param} RETURNING *",
            *args,
        )

    async def get_msn_inputs(self, project_id: int) -> list[dict]:
        """Fetch all MSN inputs for a project."""
        return await self.fetch_many(
            "SELECT * FROM project_msn_inputs WHERE project_id = $1 ORDER BY id",
            project_id,
        )

    async def delete_msn_input(self, input_id: int) -> None:
        """Delete an MSN input row."""
        await self.execute(
            "DELETE FROM project_msn_inputs WHERE id = $1", input_id
        )
