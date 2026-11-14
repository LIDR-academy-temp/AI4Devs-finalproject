import hashlib
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Document, DocumentVersion, Signer
from app.models.enums import VersionOrigin

BACKEND_DIR = Path(__file__).resolve().parents[2]
PDF_BYTES = b"%PDF-1.4\n%test\n"


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    for item in items:
        item.add_marker(pytest.mark.integration)


def alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    config.attributes["configure_logger"] = False
    return config


@pytest.fixture(scope="session")
def database_url() -> str:
    return get_settings().test_database_url


@pytest.fixture(scope="session")
def engine(database_url: str) -> Iterator[Engine]:
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError as exc:
        pytest.exit(f"PostgreSQL de tests no disponible en {database_url}: levantalo con `docker compose up -d db`.\n{exc}")

    config = alembic_config(database_url)
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    """Cada test corre dentro de una transacción que se revierte al final."""
    with engine.connect() as connection:
        transaction = connection.begin()
        with Session(bind=connection, join_transaction_mode="create_savepoint") as db_session:
            yield db_session
        transaction.rollback()


def make_signer(session: Session, cuil: str = "20123456786") -> Signer:
    signer = Signer(full_name="Juan Pérez", identifier=cuil)
    session.add(signer)
    session.flush()
    return signer


def make_document_with_v1(session: Session, content: bytes = PDF_BYTES) -> Document:
    document = Document()
    session.add(document)
    session.flush()
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        origin=VersionOrigin.UPLOADED,
        file_name="resolucion.pdf",
        content=content,
        document_hash=hashlib.sha256(content).hexdigest(),
    )
    session.add(version)
    session.flush()
    document.current_version_id = version.id
    session.flush()
    return document
