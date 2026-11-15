"""Alertas que se abren y se cierran, sin repetir el aviso (D3 de weather-track-monitoreo)."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cuentas.correo import CORREO_ALERTA, CORREO_ALERTA_NORMALIZADA, encolar_correo
from app.datos.modelos import AlertaSistema, Usuario
from app.monitoreo.controles import Resultado


def titulo(tipo: str, objeto: str) -> str:
    if tipo == "DATOS_VIEJOS":
        return f"Datos viejos en {objeto}"
    if tipo == "CICLOS_FALLIDOS":
        return f"Ciclos con error en {objeto}"
    if tipo == "DISCO_CASI_LLENO":
        return "Disco de la base casi lleno"
    return "Posibles accesos por fuerza bruta"


def _avisar(sesion: Session, tipo_correo: str, alerta: AlertaSistema, detalle: str, ahora: datetime) -> None:
    administradores = sesion.scalars(
        select(Usuario).where(
            Usuario.es_administrador, Usuario.activo, Usuario.confirmado_en.is_not(None)
        )
    ).all()
    for usuario in administradores:
        encolar_correo(
            sesion, usuario, tipo_correo, ahora, alerta=(titulo(alerta.tipo, alerta.objeto), detalle)
        )


def actualizar_alertas(sesion: Session, resultados: list[Resultado], ahora: datetime) -> None:
    """Abre, actualiza o cierra cada alerta según el último resultado de su control. Hace commit."""
    abiertas = {
        (alerta.tipo, alerta.objeto): alerta
        for alerta in sesion.scalars(select(AlertaSistema).where(AlertaSistema.cerrada_en.is_(None)))
    }
    for resultado in resultados:
        clave = (resultado.tipo, resultado.objeto)
        abierta = abiertas.pop(clave, None)
        if resultado.en_alerta and abierta is None:
            nueva = AlertaSistema(
                tipo=resultado.tipo, objeto=resultado.objeto, abierta_en=ahora, detalle=resultado.detalle
            )
            sesion.add(nueva)
            sesion.flush()
            _avisar(sesion, CORREO_ALERTA, nueva, resultado.detalle, ahora)
        elif resultado.en_alerta:
            # Sigue fallando: se actualiza el detalle, sin volver a avisar.
            abierta.detalle = resultado.detalle
        elif abierta is not None:
            abierta.cerrada_en = ahora
            _avisar(sesion, CORREO_ALERTA_NORMALIZADA, abierta, resultado.detalle, ahora)
    # Lo que ya no se evalúa, como una estación que se inactivó, se cierra sin avisar.
    for abierta in abiertas.values():
        abierta.cerrada_en = ahora
    sesion.commit()
