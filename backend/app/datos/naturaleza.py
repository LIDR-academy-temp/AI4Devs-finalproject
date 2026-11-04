"""Naturaleza de la base: impide mezclar datos reales y ficticios (D4 de weather-track-estaciones).

La fija la primera ingesta o siembra. Al arrancar, el worker y la API la comparan con `SAT2_MODO`.
"""

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.datos.modelos import ConfiguracionBase

REAL = "REAL"
FICTICIA = "FICTICIA"
COPIA_DE_PRUEBA = "COPIA_DE_PRUEBA"

# Qué naturaleza admite cada modo, y con cuál marca una base vacía.
ADMITIDAS = {
    "real": {REAL},
    "simulado": {FICTICIA},
    # Se elimina junto con el modo escenarios (grupo 4 del cambio).
    "escenarios": {FICTICIA},
    "prueba": {FICTICIA, COPIA_DE_PRUEBA},
}
INICIAL = {"real": REAL, "simulado": FICTICIA, "escenarios": FICTICIA, "prueba": FICTICIA}

DESCRIPCION = {
    REAL: "reales de SAT2",
    FICTICIA: "ficticios",
    COPIA_DE_PRUEBA: "de una copia preparada para el modo de prueba",
}


class NaturalezaIncompatible(Exception):
    """La base no corresponde al modo. El mensaje explica cómo seguir y no contiene secretos."""


def leer_naturaleza(sesion: Session) -> str | None:
    return sesion.scalar(select(ConfiguracionBase.naturaleza))


def verificar_naturaleza(sesion: Session, modo: str) -> None:
    """Falla si la base ya tiene una naturaleza que el modo no admite. No escribe nada."""
    if modo not in ADMITIDAS:
        raise NaturalezaIncompatible(f"Modo desconocido: {modo}.")
    naturaleza = leer_naturaleza(sesion)
    if naturaleza is not None and naturaleza not in ADMITIDAS[modo]:
        raise NaturalezaIncompatible(
            f"La base tiene datos {DESCRIPCION[naturaleza]} y el sistema arrancó en modo {modo}. "
            "Para no mezclarlos, usar una base nueva: otro proyecto de Docker Compose "
            "(docker compose -p <nombre>) o, para probar con datos reales, una copia preparada "
            "para el modo de prueba. La base no se modificó."
        )


def asegurar_naturaleza(sesion: Session, modo: str) -> str:
    """Verifica la base y, si todavía no tiene naturaleza, la fija según el modo. No hace commit."""
    verificar_naturaleza(sesion, modo)
    # Si dos procesos arrancan a la vez, el segundo encuentra la fila del primero.
    sesion.execute(
        insert(ConfiguracionBase)
        .values(id=1, naturaleza=INICIAL[modo])
        .on_conflict_do_nothing(index_elements=["id"])
    )
    verificar_naturaleza(sesion, modo)
    return leer_naturaleza(sesion)
