"""Modelo de datos de Weather Track (sección 3 del README y D5, D6 y D8 del diseño)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    MetaData,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

MAGNITUDES = (
    "TEMPERATURA",
    "HUMEDAD_RELATIVA",
    "VIENTO_VELOCIDAD",
    "VIENTO_DIRECCION",
    "RADIACION",
    "PRESION",
    "PRECIPITACION",
    "MOJADO_FOLIAR",
    "BATERIA",
)
CALIDADES = ("OK", "FALTANTE", "SOSPECHOSO")
ORIGENES = ("INSTANTANEO", "HISTORICO")
ESTADOS_RECOMENDACION = (
    "APTO",
    "PRECAUCION",
    "RIESGO_DERIVA",
    "NO_APLICAR",
    "DATOS_INSUFICIENTES",
)
TIPOS_EJECUCION = ("CICLO", "CARGA_INICIAL")
RESULTADOS_EJECUCION = ("EN_CURSO", "EXITO", "PARCIAL", "ERROR")


def _lista_sql(valores: tuple[str, ...]) -> str:
    return ", ".join(f"'{valor}'" for valor in valores)


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_N_name)s",
            "uq": "uq_%(table_name)s_%(column_0_N_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = (CheckConstraint("email = lower(email)", name="email_en_minusculas"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    estaciones: Mapped[list["Estacion"]] = relationship(secondary="usuario_estacion")


class Estacion(Base):
    __tablename__ = "estacion"
    __table_args__ = (
        CheckConstraint("latitud BETWEEN -90 AND 90", name="latitud_valida"),
        CheckConstraint("longitud BETWEEN -180 AND 180", name="longitud_valida"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    id_equipo_sat2: Mapped[int] = mapped_column(Integer, unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    nro_serie: Mapped[str | None] = mapped_column(String(40))
    latitud: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitud: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    activa: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))

    sensores: Mapped[list["Sensor"]] = relationship(back_populates="estacion")


class UsuarioEstacion(Base):
    __tablename__ = "usuario_estacion"

    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True
    )
    estacion_id: Mapped[int] = mapped_column(
        ForeignKey("estacion.id", ondelete="CASCADE"), primary_key=True
    )


class Sensor(Base):
    __tablename__ = "sensor"
    __table_args__ = (
        UniqueConstraint("estacion_id", "id_sensor_sat2"),
        UniqueConstraint("estacion_id", "clave_normalizada"),
        CheckConstraint(f"magnitud IN ({_lista_sql(MAGNITUDES)})", name="magnitud_valida"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    estacion_id: Mapped[int] = mapped_column(ForeignKey("estacion.id"))
    id_sensor_sat2: Mapped[int] = mapped_column(Integer)
    nombre: Mapped[str] = mapped_column(String(120))
    clave_normalizada: Mapped[str] = mapped_column(String(120))
    magnitud: Mapped[str] = mapped_column(String(30))
    altura_m: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    unidad: Mapped[str] = mapped_column(String(20))

    estacion: Mapped[Estacion] = relationship(back_populates="sensores")


class Observacion(Base):
    __tablename__ = "observacion"
    __table_args__ = (
        CheckConstraint(f"calidad IN ({_lista_sql(CALIDADES)})", name="calidad_valida"),
        CheckConstraint(f"origen IN ({_lista_sql(ORIGENES)})", name="origen_valido"),
        CheckConstraint(
            "(valor IS NULL) = (calidad = 'FALTANTE')", name="valor_nulo_solo_si_faltante"
        ),
        Index("ix_observacion_medido_en", "medido_en"),
    )

    sensor_id: Mapped[int] = mapped_column(ForeignKey("sensor.id"), primary_key=True)
    medido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    valor: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    calidad: Mapped[str] = mapped_column(String(12))
    alarma: Mapped[bool | None] = mapped_column(Boolean)
    origen: Mapped[str] = mapped_column(String(12))
    recibido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Recomendacion(Base):
    __tablename__ = "recomendacion"
    __table_args__ = (
        UniqueConstraint("estacion_id", "medido_en", "version_metodo"),
        CheckConstraint(
            f"estado IN ({_lista_sql(ESTADOS_RECOMENDACION)})", name="estado_valido"
        ),
        CheckConstraint("indice BETWEEN 0 AND 100", name="indice_en_rango"),
        CheckConstraint(
            "(indice IS NULL) = (estado = 'DATOS_INSUFICIENTES')",
            name="indice_nulo_solo_si_insuficiente",
        ),
        CheckConstraint(
            "estado <> 'APTO' OR inversion_detectada IS FALSE",
            name="apto_sin_inversion",
        ),
        CheckConstraint(
            "jsonb_typeof(motivos) = 'array' AND jsonb_array_length(motivos) > 0",
            name="con_motivos",
        ),
        Index("ix_recomendacion_ultima", "estacion_id", text("medido_en DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    estacion_id: Mapped[int] = mapped_column(ForeignKey("estacion.id"))
    medido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    calculado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    version_metodo: Mapped[str] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(String(24))
    indice: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    delta_t_c: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    inversion_detectada: Mapped[bool | None] = mapped_column(Boolean)
    motivos: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)


class EjecucionIngesta(Base):
    __tablename__ = "ejecucion_ingesta"
    __table_args__ = (
        CheckConstraint(f"tipo IN ({_lista_sql(TIPOS_EJECUCION)})", name="tipo_valido"),
        CheckConstraint(
            f"resultado IN ({_lista_sql(RESULTADOS_EJECUCION)})", name="resultado_valido"
        ),
        CheckConstraint("lecturas_guardadas >= 0", name="lecturas_no_negativas"),
        CheckConstraint(
            "tipo = 'CARGA_INICIAL' OR (ventana_desde IS NULL AND ventana_hasta IS NULL)",
            name="ventana_solo_en_cargas",
        ),
        Index("ix_ejecucion_ingesta_ultima", "estacion_id", "tipo", text("iniciada_en DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    estacion_id: Mapped[int] = mapped_column(ForeignKey("estacion.id"))
    tipo: Mapped[str] = mapped_column(String(14))
    ventana_desde: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ventana_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    iniciada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finalizada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resultado: Mapped[str] = mapped_column(String(12))
    lecturas_guardadas: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    detalle: Mapped[str | None] = mapped_column(Text)


class Sesion(Base):
    __tablename__ = "sesion"
    __table_args__ = (
        CheckConstraint("vence_en > creada_en", name="vence_despues_de_crearse"),
        Index("ix_sesion_vence_en", "vence_en"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id", ondelete="CASCADE"))
    # Solo se guarda el hash: el identificador real vive únicamente en la cookie.
    hash_identificador: Mapped[str] = mapped_column(String(64), unique=True)
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    vence_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class IntentoAcceso(Base):
    __tablename__ = "intento_acceso"
    __table_args__ = (Index("ix_intento_acceso_reciente", "email", text("ocurrido_en DESC")),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    email: Mapped[str] = mapped_column(String(254))
    ocurrido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
