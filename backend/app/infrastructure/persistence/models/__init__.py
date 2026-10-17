"""Importing this package registers every ORM model on Base.metadata, which Alembic reads."""

from app.infrastructure.persistence.models.identity import RoleRecord, UserRecord, UserRoleRecord

__all__ = ["RoleRecord", "UserRecord", "UserRoleRecord"]
