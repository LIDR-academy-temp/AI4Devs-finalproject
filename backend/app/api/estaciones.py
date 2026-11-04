"""Estaciones asignadas a la persona con sesión, activas e inactivas."""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from app.api.dependencias import SesionBd, UsuarioActual
from app.datos.modelos import Estacion, UsuarioEstacion
from app.dominio.normalizacion import ZONA_ARGENTINA

router = APIRouter(prefix="/api/v1/estaciones", tags=["estaciones"])


class EstacionResumen(BaseModel):
    id: int
    nombre: str
    latitud: Decimal
    longitud: Decimal
    # Inactiva: su equipo dejó de llegar de SAT2 y solo conserva sus históricos.
    activa: bool
    inactiva_desde: datetime | None


def _en_argentina(momento: datetime | None) -> datetime | None:
    return None if momento is None else momento.astimezone(ZONA_ARGENTINA)


@router.get("", operation_id="listarEstaciones")
def listar_estaciones(sesion: SesionBd, usuario: UsuarioActual) -> list[EstacionResumen]:
    estaciones = sesion.scalars(
        select(Estacion)
        .join(UsuarioEstacion, UsuarioEstacion.estacion_id == Estacion.id)
        .where(UsuarioEstacion.usuario_id == usuario.id)
        .order_by(Estacion.nombre)
    )
    return [
        EstacionResumen(
            id=e.id,
            nombre=e.nombre,
            latitud=e.latitud,
            longitud=e.longitud,
            activa=e.activa,
            inactiva_desde=_en_argentina(e.inactiva_desde),
        )
        for e in estaciones
    ]
