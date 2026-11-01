"""Conexión a PostgreSQL, configurada por el entorno."""

import os
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import SQLAlchemyError


@lru_cache
def obtener_motor() -> Engine:
    return create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)


def verificar_conexion() -> bool:
    try:
        with obtener_motor().connect() as conexion:
            conexion.execute(text("SELECT 1"))
    except (KeyError, SQLAlchemyError):
        return False
    return True
