"""Purchase order and versioning."""

from datetime import date
from sqlalchemy import String, ForeignKey, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.base import Base


class PurchaseOrderRecord(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_reference: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    received_on: Mapped[date] = mapped_column(Date, nullable=False)


class PurchaseOrderVersionRecord(Base):
    __tablename__ = "purchase_order_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(nullable=False)
    issued_on: Mapped[date] = mapped_column(Date, nullable=False)
    revision_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    is_in_force: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
