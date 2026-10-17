from abc import ABC, abstractmethod

from app.domain.models.user import User


class UserRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> User | None:
        """Return the user with this email, compared case-insensitively, with its roles."""
