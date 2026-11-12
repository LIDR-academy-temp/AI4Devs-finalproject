"""Fixtures de base de datos. Usan la base descartable `db_pruebas` de Docker Compose."""

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

URL_PRUEBAS = os.environ.get(
    "TEST_DATABASE_URL",
    # 127.0.0.1 y no localhost: en Windows, localhost prueba IPv6 primero y queda colgado.
    "postgresql+psycopg://weather_track:solo_pruebas@127.0.0.1:55432/weather_track_pruebas"
    "?connect_timeout=5",
)
RAIZ_BACKEND = Path(__file__).parent.parent


def falta_la_base(mensaje: str) -> None:
    """En una computadora se saltean las pruebas de base; en el pipeline eso daría verde sin probar nada."""
    if os.environ.get("EXIGIR_BASE_PRUEBAS") == "1":
        pytest.fail(mensaje, pytrace=False)
    pytest.skip(mensaje)


def configuracion_alembic() -> Config:
    configuracion = Config(RAIZ_BACKEND / "alembic.ini")
    configuracion.set_main_option("script_location", str(RAIZ_BACKEND / "migraciones"))
    configuracion.attributes["url"] = URL_PRUEBAS
    return configuracion


@pytest.fixture(scope="session")
def motor() -> Engine:
    motor = create_engine(URL_PRUEBAS)
    try:
        with motor.begin() as conexion:
            conexion.execute(text("DROP SCHEMA public CASCADE"))
            conexion.execute(text("CREATE SCHEMA public"))
    except OperationalError:
        falta_la_base("Sin base de pruebas: docker compose up -d --wait db_pruebas")
    command.upgrade(configuracion_alembic(), "head")
    yield motor
    motor.dispose()


@pytest.fixture
def sesion(motor):
    """Cada test corre en una transacción que se revierte al terminar."""
    with motor.connect() as conexion:
        transaccion = conexion.begin()
        with Session(bind=conexion, join_transaction_mode="create_savepoint") as sesion:
            yield sesion
        transaccion.rollback()
