"""Estaciones asignadas a la persona con sesión."""

from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from app.api.dependencias import SesionBd, UsuarioActual
from app.datos.modelos import Estacion, UsuarioEstacion

router = APIRouter(prefix="/api/v1/estaciones", tags=["estaciones"])


class EstacionResumen(BaseModel):
    id: int
    nombre: str
    latitud: Decimal
    longitud: Decimal


@router.get("", operation_id="listarEstaciones")
def listar_estaciones(sesion: SesionBd, usuario: UsuarioActual) -> list[EstacionResumen]:
    estaciones = sesion.scalars(
        select(Estacion)
        .join(UsuarioEstacion, UsuarioEstacion.estacion_id == Estacion.id)
        .where(UsuarioEstacion.usuario_id == usuario.id, Estacion.activa)
        .order_by(Estacion.nombre)
    )
    return [
        EstacionResumen(id=e.id, nombre=e.nombre, latitud=e.latitud, longitud=e.longitud)
        for e in estaciones
    ]
