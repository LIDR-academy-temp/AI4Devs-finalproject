from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.domain.models.user import RoleName, User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.persistence.models.identity import UserRecord


class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_email(self, email: str) -> User | None:
        statement = (
            select(UserRecord)
            .where(func.lower(UserRecord.email) == email.lower())
            .options(selectinload(UserRecord.roles))
        )
        record = self._session.scalars(statement).one_or_none()
        if record is None:
            return None
        return User(
            id=record.id,
            email=record.email,
            full_name=record.full_name,
            is_active=record.is_active,
            roles=frozenset(RoleName(role.name) for role in record.roles),
        )
